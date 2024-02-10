import _ from 'lodash';
import { DraftDonation } from '../../../entities/draftDonation';
import { getNetworkNativeToken } from '../../../provider';
import { getListOfTransactionsByAddress } from './transactionService';
import { ethers } from 'ethers';
import { closeTo } from '..';
import { findTokenByNetworkAndAddress } from '../../../utils/tokenUtils';

const transferErc20CallData = (to: string, amount: number, decimals = 18) => {
  const iface = new ethers.utils.Interface([
    'function transfer(address to, uint256 value) external',
  ]);
  return iface.encodeFunctionData('transfer', [
    to,
    ethers.utils.parseUnits(amount.toString(), decimals),
  ]);
};

export async function matchDraftDonations(
  userDraftDonationsMap: Record<string, DraftDonation[]>,
) {
  for (const user of Object.keys(userDraftDonationsMap)) {
    // group by networkId
    const userDraftDonations = userDraftDonationsMap[user];
    const userDraftDonationsByNetwork: Record<number, DraftDonation[]> =
      _.groupBy(userDraftDonations, 'networkId');

    // Iterate over networks
    for (const networkId of Object.keys(userDraftDonationsByNetwork).map(
      _networkId => +_networkId,
    )) {
      const nativeTokenLowerCase =
        getNetworkNativeToken(networkId).toLocaleLowerCase();

      // The earliest time we need to check for transactions of this user
      let minCreatedAt = Number.MAX_SAFE_INTEGER;
      // Map of target to address, token address in ERC20 case, designated native token address in native token case
      const targetTxAddrToDraftDonationMap = new Map<string, DraftDonation[]>();

      for (const draftDonation of userDraftDonationsByNetwork[networkId]) {
        const targetAddress =
          draftDonation.currency.toLocaleLowerCase() === nativeTokenLowerCase
            ? draftDonation.toWalletAddress
            : draftDonation.tokenAddress!;

        if (!targetTxAddrToDraftDonationMap.has(targetAddress)) {
          targetTxAddrToDraftDonationMap.set(targetAddress, [draftDonation]);
        } else {
          targetTxAddrToDraftDonationMap
            .get(targetAddress)!
            .push(draftDonation);
        }

        if (draftDonation.createdAt.getTime() < minCreatedAt) {
          minCreatedAt = draftDonation.createdAt.getTime();
        }
      }

      minCreatedAt = Math.floor(minCreatedAt / 1000); // convert to seconds

      let _exit = false;
      let _page = 1;
      while (_exit === false) {
        const { userRecentTransactions, lastPage } =
          await getListOfTransactionsByAddress({
            address: user,
            networkId: Number(networkId),
            page: _page,
          });

        for (const transaction of userRecentTransactions) {
          if (+transaction.timeStamp < minCreatedAt) {
            _exit = true;
            break;
          }

          const targetAddress = transaction.to.toLowerCase();
          const draftDonations =
            targetTxAddrToDraftDonationMap.get(targetAddress);

          if (draftDonations) {
            // doantions with same target address
            for (const draftDonation of draftDonations!) {
              const nativeTokenTransfer =
                draftDonation.currency.toLowerCase() === nativeTokenLowerCase;
              if (nativeTokenTransfer) {
                // native transfer
                const amount = ethers.utils.formatEther(transaction.value);
                if (!closeTo(+amount, draftDonation.amount)) {
                  continue;
                }
                // TODO: handle making transaction
                // console.log(`Native transfer tx : ${transaction.hash} matched`);
              } else {
                // ERC20 transfer
                let transferCallData = draftDonation.expectedCallData;
                if (!transferCallData) {
                  const token = await findTokenByNetworkAndAddress(
                    networkId,
                    targetAddress,
                  );
                  transferCallData = transferErc20CallData(
                    draftDonation.toWalletAddress,
                    draftDonation.amount,
                    token.decimals,
                  );
                  draftDonation.expectedCallData = transferCallData;
                  await draftDonation.save();
                }

                if (transaction.input.toLowerCase() !== transferCallData) {
                  continue;
                }

                // console.log(`ERC20 transfer tx : ${transaction.hash} matched`);
              }
            }
          }
        }

        if (lastPage) break;

        _page++;
      }
    }
  }
}
