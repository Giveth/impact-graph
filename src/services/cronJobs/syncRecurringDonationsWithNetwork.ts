import { schedule } from 'node-cron';
import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import { getPendingRecurringDonationsIds } from '../../repositories/recurringDonationRepository';
import { updateRecurringDonationStatusWithNetwork } from '../recurringDonationService';

const verifyRecurringDonationsQueue = new Bull(
  'verify-recurring-donations-queue',
  {
    redis: redisConfig,
  },
);
const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const verifyDonationsQueueCount = await verifyRecurringDonationsQueue.count();
  logger.debug(`Verify recurring donations job queues count:`, {
    verifyDonationsQueueCount,
  });
}, TWO_MINUTES);

const numberOfVerifyDonationConcurrentJob =
  Number(config.get('NUMBER_OF_VERIFY_RECURRING_CONCURRENT_JOB')) || 1;

const cronJobTime =
  (config.get('VERIFY_RECURRING_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * * *';

export const runCheckPendingRecurringDonationsCronJob = () => {
  logger.debug(
    'runCheckPendingRecurringDonationsCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  processVerifyRecurringDonationsJobs();

  // https://github.com/node-cron/node-cron#cron-syntax
  schedule(cronJobTime, async () => {
    await addJobToCheckPendingRecurringDonationsWithNetwork();
  });
  addJobToCheckPendingRecurringDonationsWithNetwork();
};

const addJobToCheckPendingRecurringDonationsWithNetwork = async () => {
  logger.debug(
    'addJobToCheckPendingRecurringDonationsWithNetwork() has been called',
  );

  const recurringDonations = await getPendingRecurringDonationsIds();
  logger.debug(
    'Pending recurringDonations to be check',
    recurringDonations.length,
  );
  recurringDonations.forEach(donation => {
    logger.debug('Add pending recurring donation to queue', {
      donationId: donation.id,
    });
    verifyRecurringDonationsQueue.add(
      {
        donationId: donation.id,
      },
      {
        jobId: `verify-recurring-donation-id-${donation.id}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  });
};

function processVerifyRecurringDonationsJobs() {
  logger.debug('processVerifyRecurringDonationsJobs() has been called');
  verifyRecurringDonationsQueue.process(
    numberOfVerifyDonationConcurrentJob,
    async (job, done) => {
      const { donationId } = job.data;
      logger.debug('job processing', { jobData: job.data });
      try {
        await updateRecurringDonationStatusWithNetwork({ donationId });
        done();
      } catch (e) {
        logger.error(
          'processVerifyRecurringDonationsJobs >> updateRecurringDonationStatusWithNetwork error',
          e,
        );
        done();
      }
    },
  );
}
