import { ModuleThread, Pool, spawn, Worker } from 'threads';
import { WorkerModule } from 'threads/dist/types/worker';
import { DRAFT_DONATION_STATUS } from '../../../entities/draftDonation';
import { ApolloContext } from '../../../types/ApolloContext';
import { logger } from '../../../utils/logger';
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
import { findActiveAnchorAddress } from '../../../repositories/anchorContractAddressRepository';
import { findRecurringDonationById } from '../../../repositories/recurringDonationRepository';
import { getSuperFluidAdapter } from '../../../adapters/adaptersFactory';
import { FlowUpdatedEvent } from '../../../adapters/superFluid/superFluidAdapterInterface';
import { convertTimeStampToSeconds } from '../../../utils/utils';

type DraftRecurringDonationWorkerFunctions = 'matchDraftRecurringDonations';
export type DraftRecurringDonationWorker =
  WorkerModule<DraftRecurringDonationWorkerFunctions>;

export async function matchDraftRecurringDonations(
  draftRecurringDonations: DraftRecurringDonation[],
) {
  logger.debug(
    'matchDraftRecurringDonations() has been called draftDonation.length',
    draftRecurringDonations.length,
  );
  for (const draftRecurringDonation of draftRecurringDonations) {
    try {
      const anchorContractAddress = await findActiveAnchorAddress({
        networkId: draftRecurringDonation.networkId,
        projectId: draftRecurringDonation.projectId,
      });
      const donor = await findUserById(draftRecurringDonation.donorId);
      const superFluidAdapter = getSuperFluidAdapter();

      const getFlowParams = {
        flowRate: draftRecurringDonation.flowRate,
        receiver: anchorContractAddress?.address?.toLowerCase() as string,
        sender: donor?.walletAddress?.toLowerCase() as string,
        timestamp_gt: convertTimeStampToSeconds(
          draftRecurringDonation.createdAt.getTime(),
        ),
      };
      const flow =
        await superFluidAdapter.getFlowByReceiverSenderFlowRate(getFlowParams);
      if (flow) {
        logger.debug('matchDraftRecurringDonations flow: ', flow);
        await submitMatchedDraftRecurringDonation(draftRecurringDonation, flow);
      } else {
        logger.error('matchDraftRecurringDonations flow is undefined', flow);
      }
    } catch (e) {
      logger.error('error validating draftRecurringDonation', {
        draftRecurringDonationId:
          draftRecurringDonation.matchedRecurringDonationId,
        flowRate: draftRecurringDonation?.flowRate,
        error: e,
      });
    }
  }
}

async function submitMatchedDraftRecurringDonation(
  draftRecurringDonation: DraftRecurringDonation,
  tx: FlowUpdatedEvent,
) {
  logger.debug(
    'submitMatchedDraftRecurringDonation() has been called',
    draftRecurringDonation,
    tx,
  );
  // Check whether a donation with same networkId and txHash already exists
  const existingRecurringDonation = await RecurringDonation.findOne({
    where: {
      networkId: draftRecurringDonation.networkId,
      txHash: tx.transactionHash,
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
  const txHash = tx.transactionHash;
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
    logger.fatal(
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
