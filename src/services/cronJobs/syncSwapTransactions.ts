import { schedule } from 'node-cron';
import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import { getStatus } from '../squidService';
import {
  getNotCompletedSwaps,
  getSwapById,
  updateSwapStatus,
  updateSwapDonationStatus,
} from '../../repositories/swapTransactionRepository';
import { DONATION_STATUS } from '../../entities/donation';
import { SWAP_TRANSACTION_STATUS } from '../../entities/swapTransaction';

const verifySwapsQueue = new Bull('verify-swaps-queue', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

const TWO_MINUTES = 1000 * 60 * 2;

// Log queue status every 2 minutes
setInterval(async () => {
  const verifySwapsQueueCount = await verifySwapsQueue.count();
  logger.debug(`Verify swaps job queues count:`, {
    verifySwapsQueueCount,
  });
}, TWO_MINUTES);

// Number of concurrent jobs to process
const numberOfVerifySwapConcurrentJob =
  Number(config.get('NUMBER_OF_VERIFY_SWAP_CONCURRENT_JOB')) || 1;

// Cron expression for how often to run the verification
const cronJobTime =
  (config.get('VERIFY_SWAP_CRONJOB_EXPRESSION') as string) || '* * * * *'; // Every minutes by default

export const runCheckPendingSwapsCronJob = () => {
  logger.debug(
    'runCheckPendingSwapsCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  processVerifySwapsJobs();
  schedule(cronJobTime, async () => {
    await addJobToCheckPendingSwaps();
  });
};

const addJobToCheckPendingSwaps = async () => {
  logger.debug('addJobToCheckPendingSwaps() has been called');

  // Get not completed swaps from database
  const notCompletedSwaps = await getNotCompletedSwaps();
  logger.debug('Not completed swaps to be checked', notCompletedSwaps.length);

  notCompletedSwaps.forEach(swap => {
    logger.debug('Add not completed swap to queue', { swapId: swap.id });
    verifySwapsQueue.add(
      {
        swapId: swap.id,
      },
      {
        jobId: `verify-swap-id-${swap.id}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  });
};

function processVerifySwapsJobs() {
  logger.debug('processVerifySwapsJobs() has been called');
  verifySwapsQueue.process(
    numberOfVerifySwapConcurrentJob,
    async (job, done) => {
      const { swapId } = job.data;
      logger.debug('job processing', { jobData: job.data });
      try {
        await verifySwapTransaction(swapId);
        done();
      } catch (e) {
        logger.error(
          'processVerifySwapsJobs >> verifySwapTransaction error',
          e,
        );
        done();
      }
    },
  );
}

const failedThresholdMinutes =
  Number(config.get('SWAP_FAILED_THRESHOLD_MINUTES')) || 60; // Default 60 minutes
const FAILED_THRESHOLD = failedThresholdMinutes * 60 * 1000; // Convert minutes to milliseconds

const verifySwapTransaction = async (swapId: number) => {
  try {
    const swap = await getSwapById(swapId);
    if (!swap) {
      throw new Error('Swap not found');
    }

    // Check if transaction is older than the failed threshold
    const transactionAge = Date.now() - swap.createdAt.getTime();
    if (transactionAge > FAILED_THRESHOLD) {
      logger.debug(
        `Swap ${swapId} is older than ${failedThresholdMinutes} minutes, marking as failed`,
      );
      await updateSwapStatus(swapId, SWAP_TRANSACTION_STATUS.FAILED);

      // Update donation status to failed as well
      if (swap.donation) {
        logger.debug(
          `Updating associated donation status to failed for swap ${swapId}`,
        );
        swap.donation.status = DONATION_STATUS.FAILED;
        await swap.donation.save();
      }
      return;
    }

    const params = {
      transactionId: swap.firstTxHash,
      ...(swap.squidRequestId && { requestId: swap.squidRequestId }),
      fromChainId: swap.fromChainId.toString(),
      toChainId: swap.toChainId.toString(),
    };

    try {
      const status = await getStatus(params);
      logger.debug(`Route status for swap ${swapId}:`, {
        status: status.squidTransactionStatus,
        requestId: swap.squidRequestId || 'not provided',
      });

      // Update swap status in database
      await updateSwapStatus(swapId, status.squidTransactionStatus);

      // If swap is completed, update related statistics
      if (isCompletedStatus(status.squidTransactionStatus)) {
        await updateSwapDonationStatus(swapId, {
          ...status,
          squidTransactionStatus: SWAP_TRANSACTION_STATUS.SUCCESS,
        });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.debug(`Transaction not found for swap ${swapId}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Error verifying swap transaction:', error);
    throw error;
  }
};

// Helper function to check if status is completed
const isCompletedStatus = (status: string) => {
  const completedStatuses = [
    SWAP_TRANSACTION_STATUS.SUCCESS,
    SWAP_TRANSACTION_STATUS.DESTINATION_EXECUTED,
  ];
  return completedStatuses.includes(status);
};
