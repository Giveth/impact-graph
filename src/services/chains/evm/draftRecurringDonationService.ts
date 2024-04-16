import _ from 'lodash';
import { ModuleThread, Pool, spawn, Worker } from 'threads';
import { DRAFT_DONATION_STATUS } from '../../../entities/draftDonation';
import { getListOfSuperFluidContractTxs } from './transactionService';
import { IContractCallTxInfo } from '../../../types/etherscan';
import { ApolloContext } from '../../../types/ApolloContext';
import { logger } from '../../../utils/logger';
import { WorkerModule } from 'threads/dist/types/worker';
import {
  DRAFT_RECURRING_DONATION_STATUS,
  DraftRecurringDonation,
  RECURRING_DONATION_ORIGINS,
} from '../../../entities/draftRecurringDonation';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../../../entities/recurringDonation';
import { RecurringDonationResolver } from '../../../resolvers/recurringDonationResolver';
import { findUserById } from '../../../repositories/userRepository';
import { getRecurringDonationTxInfo } from '../../recurringDonationService';
import { findActiveAnchorAddress } from '../../../repositories/anchorContractAddressRepository';
import { findRecurringDonationById } from '../../../repositories/recurringDonationRepository';

type DraftRecurringDonationWorkerFunctions = 'matchDraftRecurringDonations';
export type DraftRecurringDonationWorker =
  WorkerModule<DraftRecurringDonationWorkerFunctions>;

export async function matchDraftRecurringDonations(
  userDraftRecurringDonationsMap: Record<string, DraftRecurringDonation[]>,
) {
  for (const user of Object.keys(userDraftRecurringDonationsMap)) {
    // group by networkId
    const userDraftRecurringDonations = userDraftRecurringDonationsMap[user];
    logger.debug(
      `Match ${userDraftRecurringDonations.length} draft donations for ${user}`,
    );
    const userDraftRecurringDonationsByNetwork: Record<
      number,
      DraftRecurringDonation[]
    > = _.groupBy(userDraftRecurringDonations, 'networkId');

    // Iterate over networks
    for (const networkId of Object.keys(
      userDraftRecurringDonationsByNetwork,
    ).map(_networkId => +_networkId)) {
      // The earliest time we need to check for transactions of this user
      let minCreatedAt = Number.MAX_SAFE_INTEGER;
      // Map of target to address, token address in ERC721 case, designated native token address in native token case
      const targetTxAddrToDraftDonationMap = new Map<
        string,
        DraftRecurringDonation[]
      >();

      for (const draftRecurringDonation of userDraftRecurringDonationsByNetwork[
        networkId
      ]) {
        const userWalletAddress = (await findUserById(
          draftRecurringDonation.donorId,
        ))!.walletAddress?.toLowerCase() as string;

        const _array = targetTxAddrToDraftDonationMap.get(userWalletAddress);
        if (!_array) {
          targetTxAddrToDraftDonationMap.set(userWalletAddress, [
            draftRecurringDonation,
          ]);
        } else {
          _array.push(draftRecurringDonation);
        }

        if (draftRecurringDonation.createdAt.getTime() < minCreatedAt) {
          minCreatedAt = draftRecurringDonation.createdAt.getTime();
        }
      }

      minCreatedAt = Math.floor(minCreatedAt / 1000); // convert to seconds

      let _exit = false;
      let _page = 1;
      while (_exit === false) {
        const { userRecentTransactions, lastPage } =
          await getListOfSuperFluidContractTxs({
            address: user,
            networkId: Number(networkId),
            page: _page,
          });

        for (const transaction of userRecentTransactions) {
          if (+transaction.timeStamp < minCreatedAt) {
            // We have reached to TXs that are older than the oldest draft donation
            _exit = true;
            break;
          }

          const fromAddress = transaction.to.toLowerCase();
          const draftDonations =
            targetTxAddrToDraftDonationMap.get(fromAddress);

          let txDataArray: {
            receiver: string;
            flowRate: string;
            tokenAddress: string;
          }[] = [];
          try {
            txDataArray = await getRecurringDonationTxInfo({
              networkId,
              txHash: transaction?.hash,
              isBatch: false,
            });
          } catch (e) {
            logger.error(
              `Error getting tx data for ${transaction.hash} when isBatch: false`,
              e,
            );
          }
          if (txDataArray.length === 0) {
            try {
              txDataArray = await getRecurringDonationTxInfo({
                networkId,
                txHash: transaction.hash,
                isBatch: true,
              });
            } catch (e) {
              logger.error(
                `Error getting tx data for ${transaction.hash} when isBatch: true`,
                e,
              );
            }
          }

          if (txDataArray.length === 0) {
            continue;
          }

          if (draftDonations) {
            // donations with same target address
            for (const draftDonation of draftDonations!) {
              const anchorContractAddress = await findActiveAnchorAddress({
                networkId: draftDonation.networkId,
                projectId: draftDonation.projectId,
              });
              for (const txData of txDataArray) {
                if (
                  txData.receiver.toLowerCase() ===
                    anchorContractAddress?.address.toLowerCase() &&
                  txData.flowRate === draftDonation.flowRate
                ) {
                  await submitMatchedDraftRecurringDonation(
                    draftDonation,
                    transaction,
                  );
                  break;
                }
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

async function submitMatchedDraftRecurringDonation(
  draftRecurringDonation: DraftRecurringDonation,
  tx: IContractCallTxInfo,
) {
  console.log(
    'submitMatchedDraftRecurringDonation() has been called',
    draftRecurringDonation,
    tx,
  );
  // Check whether a donation with same networkId and txHash already exists
  const existingRecurringDonation = await RecurringDonation.findOne({
    where: {
      networkId: draftRecurringDonation.networkId,
      txHash: tx.hash,
      projectId: draftRecurringDonation.projectId,
    },
  });

  if (existingRecurringDonation) {
    // Check whether the donation has not been saved during matching procedure
    await draftRecurringDonation.reload();
    if (draftRecurringDonation.status === DRAFT_DONATION_STATUS.PENDING) {
      draftRecurringDonation.status = DRAFT_DONATION_STATUS.FAILED;
      draftRecurringDonation.errorMessage = `Recurring donation with same networkId and txHash with ID ${existingRecurringDonation.id} already exists`;
      await draftRecurringDonation.save();
    }
    return;
  }

  const recurringDonationResolver = new RecurringDonationResolver();

  const {
    flowRate,
    networkId,
    anonymous,
    currency,
    projectId,
    isBatch,
    matchedRecurringDonationId,
    isForUpdate,
  } = draftRecurringDonation;
  const txHash = tx.hash;
  try {
    logger.debug(
      `Creating donation for draftDonation with ID ${draftRecurringDonation.id}`,
    );
    let recurringDonation;
    if (isForUpdate) {
      const oldRecurringDonation = await findRecurringDonationById(
        matchedRecurringDonationId!,
      );
      recurringDonation =
        await recurringDonationResolver.updateRecurringDonationParams(
          {
            req: { user: { userId: draftRecurringDonation.donorId }, auth: {} },
          } as ApolloContext,
          projectId,
          networkId,
          currency,

          txHash,
          flowRate,
          anonymous,
          oldRecurringDonation?.isArchived,
        );
    } else {
      recurringDonation =
        await recurringDonationResolver.createRecurringDonation(
          {
            req: { user: { userId: draftRecurringDonation.donorId }, auth: {} },
          } as ApolloContext,
          projectId,
          networkId,
          txHash,
          currency,
          flowRate,
          anonymous,
          isBatch,
        );
    }

    await RecurringDonation.update(Number(recurringDonation.id), {
      origin: RECURRING_DONATION_ORIGINS.DRAFT_RECURRING_DONATION_MATCHING,
      status: RECURRING_DONATION_STATUS.PENDING,
    });

    await DraftRecurringDonation.update(draftRecurringDonation.id, {
      matchedRecurringDonationId: recurringDonation.id,
    });

    logger.debug(
      `Recurring donation with ID ${recurringDonation.id} has been created for draftRecurringDonation with ID ${draftRecurringDonation.id}`,
    );
    // donation resolver does it
    // draftDonation.status = DRAFT_DONATION_STATUS.MATCHED;
    // draftDonation.matchedDonationId = Number(donationId);
  } catch (e) {
    logger.error(
      `Error on creating donation for draftDonation with ID ${draftRecurringDonation.id}`,
      e,
    );
    draftRecurringDonation.status = DRAFT_RECURRING_DONATION_STATUS.FAILED;
    draftRecurringDonation.errorMessage = e.message;
    await draftRecurringDonation.save();
  }
}

let workerIsIdle = true;
let pool: Pool<ModuleThread<DraftRecurringDonationWorker>>;

export async function runDraftRecurringDonationMatchWorker() {
  if (!workerIsIdle) {
    logger.debug('Draft recurring donation matching worker is already running');
    return;
  }
  workerIsIdle = false;

  if (!pool) {
    pool = Pool(
      () =>
        spawn(
          new Worker('./../../../workers/draftRecurringDonationMatchWorker'),
        ),
      {
        name: 'draftRecurringDonationMatchWorker',
        concurrency: 4,
        size: 2,
      },
    );
  }
  try {
    await pool.queue(draftRecurringDonationWorker =>
      draftRecurringDonationWorker.matchDraftRecurringDonations(),
    );
    await pool.settled(true);
  } catch (e) {
    logger.error(
      `error in calling draft recurring donation match worker: ${e.message}`,
    );
  } finally {
    workerIsIdle = true;
  }
}
