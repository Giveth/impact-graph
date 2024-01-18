import config from '../../config';
import abiDecoder from 'abi-decoder';
import { Donation } from '../../entities/donation';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import { normalizeAmount } from '../../utils/utils';
import { NetworkTransactionInfo } from '../chains';
import { getNetworkNativeToken, getProvider } from '../../provider';
import { erc20ABI } from '../../assets/erc20ABI';
import { gnosisSafeL2ABI } from '../../assets/gnosisSafeL2ABI';
import { User } from '../../entities/user';
import { Token } from '../../entities/token';
import { Project } from '../../entities/project';
import { calculateGivbackFactor } from '../givbackService';
import moment from 'moment';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../userService';
import { toFixNumber, updateTotalDonationsOfProject } from '../donationService';
import {
  refreshProjectDonationSummaryView,
  refreshProjectEstimatedMatchingView,
} from '../projectViewsService';
import { CoingeckoPriceAdapter } from '../../adapters/price/CoingeckoPriceAdapter';
import { QfRound } from '../../entities/qfRound';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';

// tslint:disable-next-line:no-var-requires
const ethers = require('ethers');
abiDecoder.addABI(erc20ABI);

const QF_ROUND_ID = config.get('LOST_DONATIONS_QF_ROUND');
const NETWORK_ID = config.get('LOST_DONATIONS_NETWORK_ID');

const cronJobTime =
  (config.get('IMPORT_LOST_DONATIONS_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * 0';

// coma separated txHashes
const lostDonationsTxHashes = process.env.LOST_DONATIONS_TX_HASHES || '';

export const runSyncLostDonations = () => {
  logger.debug('runSyncLostDonations() has been called');
  schedule(cronJobTime, async () => {
    await importLostDonations();
  });
};

const millisecondTimestampToDate = (timestamp: number): Date => {
  return new Date(timestamp);
};

export const importLostDonations = async () => {
  const networkId = NETWORK_ID ? Number(NETWORK_ID) : 10; // optimism
  let donationParams;
  const qfRoundId = QF_ROUND_ID ? Number(QF_ROUND_ID) : undefined;
  try {
    const qfRound = await QfRound.createQueryBuilder('qfRound')
      .where(`qfRound.id = :id`, { id: qfRoundId })
      .getOne();

    const donationTxHashes = lostDonationsTxHashes.split(',');

    for (const tx of donationTxHashes) {
      try {
        const donationExists = await Donation.createQueryBuilder('donation')
          .where(`lower(donation.transactionId) = :hash`, {
            hash: tx.toLowerCase(),
          })
          .getOne();

        if (donationExists) continue; // avoid duplicates

        const transaction = await getProvider(networkId).getTransaction(tx);
        if (!transaction) {
          // Transaction not found
          continue;
        }

        const receipt = await getProvider(networkId).getTransactionReceipt(tx);
        if (!receipt) {
          // Transaction is not mined yet
          // https://web3js.readthedocs.io/en/v1.2.0/web3-eth.html#gettransactionreceipt
          continue;
        }

        // decode transaction as ERC20 Token
        const transactionData = abiDecoder.decodeMethod(transaction.data);
        const erc20Token = transactionData?.params[0].value;

        // Search for the address in the correct location in the transaction
        const userAddress = erc20Token
          ? '0x' + receipt?.logs[0]?.topics[1]?.substring(26)
          : transaction.from;

        const dbUser = await User.createQueryBuilder('user')
          .where(`lower(user.walletAddress) = :address`, {
            address: userAddress.toLowerCase(),
          })
          .getOne();

        if (!dbUser) continue; // User does not exist on giveth, not a UI donation, skip

        // Check if its an ERC-20 Token
        let tokenInDB = await Token.createQueryBuilder('token')
          .where(`lower(token.address) = :address`, {
            address: erc20Token?.toLowerCase(),
          })
          .andWhere(`token.networkId = :networkId`, { networkId })
          .getOne();

        if (tokenInDB) {
          // It's a token transfer donation
          donationParams = await getDonationDetailForTokenTransfer(
            tx,
            networkId,
            transaction,
            receipt,
            tokenInDB,
            transactionData,
          );

          if (!donationParams) continue; // transaction not mined yet
        } else if (
          !tokenInDB &&
          transaction.value &&
          transaction.value.gt(0) &&
          (!transaction.data || transaction.data === '0x')
        ) {
          // it's an eth transfer native token
          const nativeTokenSymbol = getNetworkNativeToken(networkId);
          const nativeToken = await Token.createQueryBuilder('token')
            .where(`token.symbol = symbol`, { symbol: nativeTokenSymbol })
            .andWhere(`token."networkId" = :networkId`, { networkId })
            .getOne();

          tokenInDB = nativeToken;

          donationParams = await getDonationDetailForNormalTransfer(
            tx,
            networkId,
            transaction,
            receipt,
            nativeToken!,
          );
        } else {
          continue; // Not a transaction recognized by our logic
        }

        const project = await Project.createQueryBuilder('project')
          .leftJoinAndSelect('project.addresses', 'addresses')
          .leftJoinAndSelect('project.adminUser', 'adminUser')
          .where(`lower(addresses.address) = :address`, {
            address: donationParams?.to?.toLowerCase(),
          })
          .getOne();

        if (!project) continue; // project doesn't exist on giveth, skip donation

        const donationDate = millisecondTimestampToDate(
          donationParams.timestamp * 1000,
        );
        const donationDateDbFormat = moment(donationDate).format(
          'YYYY-MM-DD HH:mm:ss',
        );
        const donationDateCoingeckoFormat =
          moment(donationDate).format('DD-MM-YYYY');

        const coingeckoAdapter = new CoingeckoPriceAdapter();
        let ethereumPriceAtDate;
        try {
          ethereumPriceAtDate = await coingeckoAdapter.getTokenPriceAtDate({
            symbol: tokenInDB!.coingeckoId,
            date: donationDateCoingeckoFormat,
          });
        } catch (e) {
          logger.error('importLostDonations() coingecko error', e);
        }

        if (!ethereumPriceAtDate) {
          throw new Error(
            i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND),
          );
        }

        const { givbackFactor, projectRank, powerRound, bottomRankInRound } =
          await calculateGivbackFactor(project.id as number);

        const dbDonation = Donation.create({
          fromWalletAddress: donationParams.from.toLowerCase(),
          toWalletAddress: donationParams.to.toLowerCase(),
          transactionId: tx.toLowerCase(),
          projectId: project.id,
          currency: donationParams.currency,
          tokenAddress: tokenInDB?.address,
          amount: donationParams.amount,
          valueUsd: toFixNumber(ethereumPriceAtDate * donationParams.amount, 4),
          transactionNetworkId: networkId,
          createdAt: donationDateDbFormat,
          givbackFactor,
          projectRank,
          powerRound,
          bottomRankInRound,
          status: 'verified',
          anonymous: false,
          segmentNotified: true,
          isTokenEligibleForGivback: tokenInDB?.isGivbackEligible,
          isProjectVerified: project.verified,
          qfRoundId: qfRound?.id,
        });

        await dbDonation.save();

        await updateUserTotalDonated(dbUser.id);
        await updateUserTotalReceived(project.adminUser?.id);
        await updateTotalDonationsOfProject(project.id);
      } catch (e) {
        logger.error('importLostDonations() error');
      }
    }

    // Figure out if its ideal to call this here or once, maybe in a button in adminjs
    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();
  } catch (e) {
    logger.error('importLostDonations() error', e);
  }
};

// native token transfer ETH for optimism
async function getDonationDetailForNormalTransfer(
  txHash: string,
  networkId: number,
  transaction: any,
  receipt: any,
  token: Token,
): Promise<NetworkTransactionInfo | null> {
  if (!receipt.status) {
    return null;
  }

  const block = await getProvider(networkId).getBlock(
    transaction.blockNumber as number,
  );

  const transactionTo = transaction.to;
  const amount = ethers.utils.formatEther(transaction.value);

  return {
    from: transaction.from,
    timestamp: block.timestamp as number,
    to: transactionTo as string,
    hash: txHash,
    amount,
    currency: token.symbol,
  };
}

async function getDonationDetailForTokenTransfer(
  txHash: string,
  networkId: number,
  transaction: any,
  receipt: any,
  token: Token,
  transactionData?: any,
): Promise<NetworkTransactionInfo | null> {
  if (!receipt.status || !transactionData) {
    return null;
  }

  const transactionFrom: string =
    '0x' + receipt?.logs[0]?.topics[1]?.substring(26);
  const transactionTo: string =
    '0x' + receipt?.logs[0]?.topics[2]?.substring(26);

  const amount = Number(
    ethers.utils.formatUnits(
      ethers.BigNumber.from(receipt?.logs[1].data),
      'ether',
    ),
  );

  const block = await getProvider(networkId).getBlock(
    transaction.blockNumber as number,
  );
  return {
    from: transactionFrom,
    timestamp: block.timestamp as number,
    hash: txHash,
    to: transactionTo!,
    amount,
    currency: token.symbol,
  };
}
