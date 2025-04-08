import _ from 'lodash';
import { ethers } from 'ethers';
import { ModuleThread, Pool, spawn, Worker } from 'threads';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../../../entities/draftDonation';
import { getNetworkNativeToken } from '../../../provider';
import { getListOfTransactionsByAddress } from './transactionService';
import { closeTo } from '..';
import { findTokenByNetworkAndAddress } from '../../../utils/tokenUtils';
import { ITxInfo } from '../../../types/etherscan';
import { DONATION_ORIGINS, Donation } from '../../../entities/donation';
import { ApolloContext } from '../../../types/ApolloContext';
import { logger } from '../../../utils/logger';
import { DraftDonationWorker } from '../../../workers/draftDonationMatchWorker';
import { normalizeAmount } from '../../../utils/utils';
import { getDonationResolver } from '../../donationService';

export const isAmountWithinTolerance = (
  callData1,
  callData2,
  tokenDecimals,
) => {
  // Define the tolerance as 0.001 tokens in terms of the full token amount
  const tolerance = 0.001; // For a readable number, directly as floating point

  // Function to extract and convert the amount part of the callData using BigInt for precision
  function extractAmount(callData) {
    const amountHex = callData.slice(-64); // Last 64 characters are the amount in hexadecimal
    return BigInt('0x' + amountHex);
  }

  const amount1 = extractAmount(callData1);
  const amount2 = extractAmount(callData2);

  // Convert BigInt amounts to string then normalize
  const normalizedAmount1 = normalizeAmount(amount1.toString(), tokenDecimals);
  const normalizedAmount2 = normalizeAmount(amount2.toString(), tokenDecimals);

  // Compare within tolerance using normalized floating point numbers
  return Math.abs(normalizedAmount1 - normalizedAmount2) <= tolerance;
};

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
  logger.debug('matchDraftDonations() has been called');
  for (const user of Object.keys(userDraftDonationsMap)) {
    // group by networkId
    const userDraftDonations = userDraftDonationsMap[user];
    logger.debug(
      `Match ${userDraftDonations.length} draft donations for ${user}`,
    );
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

        const _array = targetTxAddrToDraftDonationMap.get(targetAddress);
        if (!_array) {
          targetTxAddrToDraftDonationMap.set(targetAddress, [draftDonation]);
        } else {
          _array.push(draftDonation);
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
        logger.debug('matchDraftDonations() userTransactionsCount ', {
          address: user,
          networkId: Number(networkId),
          txCount: userRecentTransactions?.length,
        });

        for (const transaction of userRecentTransactions) {
          if (+transaction.timeStamp < minCreatedAt) {
            _exit = true;
            break;
          }

          const targetAddress = transaction.to.toLowerCase();
          const draftDonations =
            targetTxAddrToDraftDonationMap.get(targetAddress);

          logger.debug('matchDraftDonations() draftDonations count', {
            address: user,
            networkId: Number(networkId),
            draftDonationsCount: draftDonations?.length,
            targetTxAddrToDraftDonationMap,
            targetAddress,
            userDraftDonationsByNetwork,
          });

          if (draftDonations) {
            // doantions with same target address
            for (const draftDonation of draftDonations!) {
              const nativeTokenTransfer =
                draftDonation.currency.toLowerCase() === nativeTokenLowerCase;
              if (nativeTokenTransfer) {
                // native transfer
                const amount = ethers.utils.formatEther(transaction.value);
                if (!closeTo(+amount, draftDonation.amount)) {
                  logger.debug(
                    'matchDraftDonations() amounts are not closed',
                    draftDonation,
                    {
                      amount,
                      txHash: transaction.hash,
                    },
                  );
                  continue;
                }
                await submitMatchedDraftDonation(draftDonation, transaction);
              } else {
                const token = await findTokenByNetworkAndAddress(
                  networkId,
                  targetAddress,
                );
                // ERC20 transfer
                let transferCallData = draftDonation.expectedCallData;
                logger.debug('matchDraftDonations() transferCallData', {
                  transferCallData,
                  transaction,
                });
                if (!transferCallData) {
                  transferCallData = transferErc20CallData(
                    draftDonation.toWalletAddress,
                    draftDonation.amount,
                    token.decimals,
                  );
                  await DraftDonation.update(draftDonation.id, {
                    expectedCallData: transferCallData,
                  });
                  draftDonation.expectedCallData = transferCallData;
                }

                const isToAddressAreTheSame =
                  transferCallData.slice(0, 64).toLowerCase() ===
                  transaction.input.slice(0, 64).toLocaleLowerCase();
                if (
                  // TODO In the future we should compare exact match, but now because we save amount as number not bigInt in our db exact match with return false for some number because of rounding
                  !isToAddressAreTheSame ||
                  !isAmountWithinTolerance(
                    transaction.input,
                    transferCallData,
                    token.decimals,
                  )
                ) {
                  logger.debug(
                    '!isToAddressAreTheSame || !isAmountWithinTolerance(transaction.input, transferCallData, token.decimals)',
                    {
                      transferCallData,
                      transaction,
                      isToAddressAreTheSame,
                      isAmountWithinTolerance: isAmountWithinTolerance(
                        transaction.input,
                        transferCallData,
                        token.decimals,
                      ),
                    },
                  );
                  continue;
                }

                await submitMatchedDraftDonation(draftDonation, transaction);
              }
            }
          } else {
            logger.debug('Not any draftDonations', {
              targetAddress,
            });
          }
        }

        if (lastPage) break;

        _page++;
      }
    }
  }
}

async function submitMatchedDraftDonation(
  draftDonation: DraftDonation,
  tx: ITxInfo,
) {
  logger.debug('submitMatchedDraftDonation()', {
    draftDonation,
    tx,
  });
  // Check whether a donation with same networkId and txHash already exists
  const existingDonation = await Donation.findOne({
    where: {
      transactionNetworkId: draftDonation.networkId,
      transactionId: tx.hash,
    },
  });

  if (existingDonation) {
    // Check whether the donation has not been saved during matching procedure
    await draftDonation.reload();
    if (draftDonation.status === DRAFT_DONATION_STATUS.PENDING) {
      draftDonation.status = DRAFT_DONATION_STATUS.FAILED;
      draftDonation.errorMessage = `Donation with same networkId and txHash with ID ${existingDonation.id} already exists`;
      await draftDonation.save();
    }
    return;
  }

  const {
    amount,
    networkId,
    tokenAddress,
    anonymous,
    currency,
    projectId,
    referrerId,
  } = draftDonation;

  try {
    logger.debug(
      `Creating donation for draftDonation with ID ${draftDonation.id}`,
    );
    const donationId = await getDonationResolver().createDonation(
      amount,
      tx.hash,
      networkId,
      tokenAddress,
      anonymous,
      currency,
      projectId,
      +tx.nonce,
      '', // transakId
      {
        req: { user: { userId: draftDonation.userId }, auth: {} },
      } as ApolloContext,
      referrerId,
      '', // safeTransactionId
      undefined, // draft donation id
      undefined, // use donationBox
      undefined, // relevant donation tx hash
      undefined, // swapData
      undefined, //fromTokenAmount
      new Date(+tx.timeStamp * 1000),
    );

    await Donation.update(Number(donationId), {
      origin: DONATION_ORIGINS.DRAFT_DONATION_MATCHING,
    });

    logger.debug(
      `Donation with ID ${donationId} has been created for draftDonation with ID ${draftDonation.id}`,
    );
    // donation resolver does it
    // draftDonation.status = DRAFT_DONATION_STATUS.MATCHED;
    // draftDonation.matchedDonationId = Number(donationId);
  } catch (e) {
    logger.fatal(
      `Error on creating donation for draftDonation with ID ${draftDonation.id}`,
      e,
    );
    draftDonation.status = DRAFT_DONATION_STATUS.FAILED;
    draftDonation.errorMessage = e.message;
    await draftDonation.save();
  }
}

let workerIsIdle = true;
let pool: Pool<ModuleThread<DraftDonationWorker>>;
export async function runDraftDonationMatchWorker() {
  logger.debug('runDraftDonationMatchWorker() has been called');
  if (!workerIsIdle) {
    logger.debug('Draft donation matching worker is already running');
    return;
  }
  workerIsIdle = false;

  if (!pool) {
    logger.debug(
      'runDraftDonationMatchWorker() pool is null, need to instantiate it',
    );
    pool = Pool(
      () => spawn(new Worker('./../../../workers/draftDonationMatchWorker')),
      {
        name: 'draftDonationMatchWorker',
        concurrency: 1,
        maxQueuedJobs: 1,
        size: 1,
      },
    );
  }
  try {
    logger.debug('runDraftDonationMatchWorker() before queuing the pool');
    await pool.queue(draftDonationWorker =>
      draftDonationWorker.matchDraftDonations(),
    );
    logger.debug('runDraftDonationMatchWorker() after queuing the pool');
    await pool.settled(true);
    logger.debug('runDraftDonationMatchWorker() pool.settled(true)');
  } catch (e) {
    logger.error(
      `runDraftDonationMatchWorker() error in calling draft match worker: ${e}`,
    );
  } finally {
    workerIsIdle = true;
  }
}
