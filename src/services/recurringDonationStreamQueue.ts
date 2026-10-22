import Bull from 'bull';
import { logger } from '../utils/logger';
import {
  findActiveRecurringDonations,
  findRecurringDonationById,
} from '../repositories/recurringDonationRepository';
import { redisConfig } from '../redis';
import config from '../config';
import { getCurrentDateFormatted, sleep } from '../utils/utils';
import {
  createRelatedDonationsToStream,
  isRecurringDonationFinal,
  withRecurringDonationSyncLock,
} from './recurringDonationService';

const updateRecurringDonationsStreamQueue = new Bull(
  'update-recurring-donations-stream-queue',
  {
    redis: redisConfig,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
    },
  },
);
const TWO_MINUTES = 1000 * 60 * 2;
// Bull-level retries after in-process lock retries are exhausted.
const STREAM_SYNC_JOB_ATTEMPTS = 3;
const STREAM_SYNC_JOB_BACKOFF_MS = 60_000;
setInterval(async () => {
  const updateRecurringDonationsStreamQueueCount =
    await updateRecurringDonationsStreamQueue.count();
  logger.debug(`Update recurring donations stream job queues count:`, {
    updateRecurringDonationsStreamQueueCount,
  });
}, TWO_MINUTES);

export const updateRecurringDonationsStream = async () => {
  logger.debug('updateRecurringDonationsStream Job Queue has been called');

  const recurringDonations = await findActiveRecurringDonations();
  logger.debug(
    'updateRecurringDonationsStream-Active recurring donations length',
    recurringDonations.length,
  );
  recurringDonations.forEach(recurringDonation => {
    logger.debug(
      'updateRecurringDonationsStream-Add pending recurringDonation to queue',
      {
        recurringDonationId: recurringDonation.id,
      },
    );
    updateRecurringDonationsStreamQueue.add(
      {
        recurringDonationId: recurringDonation.id,
      },
      {
        // Because we want to run this job once per day so we need to add the date to the job id
        jobId: `update-recurring-donations-stream-queue-${getCurrentDateFormatted()}-${
          recurringDonation.id
        }`,
        // Only a RecurringDonationSyncLockedError is reported to Bull as a
        // failure (see processRecurringDonationStreamJobs), so these retries
        // are for lock contention alone; other errors keep today's behaviour.
        attempts: STREAM_SYNC_JOB_ATTEMPTS,
        backoff: { type: 'fixed', delay: STREAM_SYNC_JOB_BACKOFF_MS },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  });
};

export function processRecurringDonationStreamJobs() {
  logger.debug('processRecurringDonationStreamJobs() has been called');
  updateRecurringDonationsStreamQueue.process(
    numberOfUpdateRecurringDonationsStreamConcurrentJob,
    async (job, done) => {
      const { recurringDonationId } = job.data;
      logger.debug('job processing', { jobData: job.data });
      try {
        await updateRecurringDonationStream({ recurringDonationId });
        done();
      } catch (e) {
        logger.error(
          'processRecurringDonationStreamJobs >> updateRecurringDonationStream error',
          e,
        );
        // Lock contention is the one error worth a Bull retry (the job
        // options above set attempts/backoff); everything else completes the
        // job as before so a persistent error does not loop.
        done(e instanceof RecurringDonationSyncLockedError ? e : undefined);
      }
    },
  );
}

const numberOfUpdateRecurringDonationsStreamConcurrentJob =
  Number(config.get('NUMBER_OF_UPDATE_RECURRING_DONATION_CONCURRENT_JOB')) || 1;

// When another sync (the on-demand reconciliation, or a previous run of this
// job) holds the per-donation lease, wait a little and try again instead of
// treating "locked" as a successful sync: the queue adds each donation once a
// day (jobId carries the date), so a silently skipped job would leave the
// donation without stream-period donations until tomorrow. Between attempts
// the donation is re-read so work the other sync already finished is skipped.
export const STREAM_SYNC_LOCK_RETRY_ATTEMPTS = 3;
export const STREAM_SYNC_LOCK_RETRY_DELAY_MS = 2_000;

export class RecurringDonationSyncLockedError extends Error {
  constructor(recurringDonationId: number) {
    super(
      `recurring donation ${recurringDonationId} is still locked by another sync after ${STREAM_SYNC_LOCK_RETRY_ATTEMPTS} attempts`,
    );
    this.name = 'RecurringDonationSyncLockedError';
  }
}

export const updateRecurringDonationStream = async (params: {
  recurringDonationId: number;
}) => {
  logger.debug(
    'updateRecurringDonationStream() has been called for id',
    params.recurringDonationId,
  );
  const recurringDonation = await findRecurringDonationById(
    params.recurringDonationId,
  );
  if (!recurringDonation) return;
  for (let attempt = 1; attempt <= STREAM_SYNC_LOCK_RETRY_ATTEMPTS; attempt++) {
    const outcome = await withRecurringDonationSyncLock(
      recurringDonation.id,
      async () => {
        // Re-read inside the lock: the on-demand reconciliation (or an earlier
        // run) may have finished this donation after it was loaded above, and
        // syncing that stale snapshot would mark it ENDED a second time and
        // resend the stream-ended notification.
        const current =
          (await findRecurringDonationById(recurringDonation.id)) ||
          recurringDonation;
        if (isRecurringDonationFinal(current)) {
          logger.info(
            'updateRecurringDonationStream() donation was finished by another sync, nothing to do',
            { recurringDonationId: current.id },
          );
          return;
        }
        await createRelatedDonationsToStream(current);
      },
    );
    if (outcome.acquired) return;
    logger.info(
      'updateRecurringDonationStream() donation is being synced elsewhere, will retry',
      { recurringDonationId: recurringDonation.id, attempt },
    );
    if (attempt < STREAM_SYNC_LOCK_RETRY_ATTEMPTS) {
      await sleep(STREAM_SYNC_LOCK_RETRY_DELAY_MS);
    }
  }
  // Surfaced as a job failure (logged by processRecurringDonationStreamJobs)
  // rather than a silent success.
  throw new RecurringDonationSyncLockedError(params.recurringDonationId);
};
