import { schedule } from 'node-cron';
import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import { syncDonationStatusWithBlockchainNetwork } from '../donationService';
import { getPendingDonationsIds } from '../../repositories/donationRepository';

const verifyDonationsQueue = new Bull('verify-donations-queue', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});
const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const verifyDonationsQueueCount = await verifyDonationsQueue.count();
  logger.debug(`Verify donations job queues count:`, {
    verifyDonationsQueueCount,
  });
}, TWO_MINUTES);

// As etherscan free plan support 5 request per second I think it's better the concurrent jobs should not be
// more than 5 with free plan https://etherscan.io/apis
const numberOfVerifyDonationConcurrentJob =
  Number(config.get('NUMBER_OF_VERIFY_DONATION_CONCURRENT_JOB')) || 1;

const cronJobTime =
  (config.get('VERIFY_DONATION_CRONJOB_EXPRESSION') as string) || '0 0 * * * *';

export const runCheckPendingDonationsCronJob = () => {
  logger.debug(
    'runCheckPendingDonationsCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  processVerifyDonationsJobs();
  // https://github.com/node-cron/node-cron#cron-syntax
  schedule(cronJobTime, async () => {
    await addJobToCheckPendingDonationsWithNetwork();
  });
};

const addJobToCheckPendingDonationsWithNetwork = async () => {
  logger.debug('addJobToCheckPendingDonationsWithNetwork() has been called');

  const donations = await getPendingDonationsIds();
  logger.debug('Pending donations to be check', donations.length);
  donations.forEach(donation => {
    logger.debug('Add pending donation to queue', { donationId: donation.id });
    verifyDonationsQueue.add(
      {
        donationId: donation.id,
      },
      {
        jobId: `verify-donation-id-${donation.id}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  });
};

function processVerifyDonationsJobs() {
  logger.debug('processVerifyDonationsJobs() has been called');
  verifyDonationsQueue.process(
    numberOfVerifyDonationConcurrentJob,
    async (job, done) => {
      const { donationId } = job.data;
      logger.debug('job processing', { jobData: job.data });
      try {
        await syncDonationStatusWithBlockchainNetwork({ donationId });
        done();
      } catch (e) {
        logger.error(
          'processVerifyDonationsJobs >> syncDonationStatusWithBlockchainNetwork error',
          e,
        );
        done();
      }
    },
  );
}
