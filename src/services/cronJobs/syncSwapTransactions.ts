import { schedule } from 'node-cron';
import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import { getStatus } from '../squidService';
import {
  getPendingSwaps,
  getSwapById,
  updateSwapStatus,
  updateSwapDonationStatus,
} from '../../repositories/swapRepository';

const verifySwapsQueue = new Bull('verify-swaps-queue', {
  redis: redisConfig,
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

  // Get pending swaps from database
  const pendingSwaps = await getPendingSwaps();
  logger.debug('Pending swaps to be checked', pendingSwaps.length);

  pendingSwaps.forEach(swap => {
    logger.debug('Add pending swap to queue', { swapId: swap.id });
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

// Verify a single swap transaction
const verifySwapTransaction = async (swapId: number) => {
  try {
    const swap = await getSwapById(swapId);
    if (!swap) {
      throw new Error('Swap not found');
    }

    // Get status from Squid API
    const status = await getStatus({
      transactionId: swap.firstTxHash,
      requestId: swap.squidRequestId,
      fromChainId: swap.fromChainId.toString(),
      toChainId: swap.toChainId.toString(),
    });

    // Update swap status in database
    await updateSwapStatus(swapId, status.squidTransactionStatus);

    // If swap is completed, update related statistics
    if (isCompletedStatus(status.squidTransactionStatus)) {
      await updateSwapDonationStatus(swapId, status);
    }
  } catch (error) {
    logger.error('Error verifying swap transaction:', error);
    throw error;
  }
};

// Helper function to check if status is completed
const isCompletedStatus = (status: string) => {
  const completedStatuses = ['success'];
  return completedStatuses.includes(status);
};
