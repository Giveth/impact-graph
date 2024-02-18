import { logger } from '../utils/logger';
import { findActiveRecurringDonations } from '../repositories/recurringDonationRepository';
import Bull from 'bull';
import { redisConfig } from '../redis';
import config from '../config';
import { getCurrentDateFormatted } from '../utils/utils';

const updateRecurringDonationsStreamQueue = new Bull(
  'update-recurring-donations-stream-queue',
  {
    redis: redisConfig,
  },
);
const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const updateRecurringDonationsStreamQueueCount =
    await updateRecurringDonationsStreamQueue.count();
  logger.debug(`Update recurring donations stream job queues count:`, {
    updateRecurringDonationsStreamQueueCount,
  });
}, TWO_MINUTES);

export const updateRecurringDonationsStream = async () => {
  logger.debug('addJobToQueue() has been called');

  const recurringDonations = await findActiveRecurringDonations();
  logger.debug('Active recurring donations length', recurringDonations.length);
  recurringDonations.forEach(recurringDonation => {
    logger.debug('Add pending recurringDonation to queue', {
      recurringDonationId: recurringDonation.id,
    });
    updateRecurringDonationsStreamQueue.add(
      {
        recurringDonationId: recurringDonation.id,
      },
      {
        // Because we want to run this job once per day so we need to add the date to the job id
        jobId: `update-recurring-donations-stream-queue-${getCurrentDateFormatted()}-${
          recurringDonation.id
        }`,
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
        done();
      }
    },
  );
}

const numberOfUpdateRecurringDonationsStreamConcurrentJob =
  Number(config.get('NUMBER_OF_UPDATE_RECURRING_DONATION_CONCURRENT_JOB')) || 1;

export const updateRecurringDonationStream = async (params: {
  recurringDonationId: number;
}) => {
  // TODO Implement this (Get stream from blockchain and update the recurring donations)
  logger.debug('updateRecurringDonationStream() has been called');
};
