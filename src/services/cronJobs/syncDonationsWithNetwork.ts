import { Donation, DONATION_STATUS } from '../../entities/donation';
import { errorMessages } from '../../utils/errorMessages';
import { schedule } from 'node-cron';

// @ts-ignore
// everything I used had problem so I had to add ts-ignore https://github.com/OptimalBits/bull/issues/1772
import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import { syncDonationStatusWithBlockchainNetwork } from '../donationService';

const verifyDonationsQueue = new Bull('verify-donations-queue', {
  redis: redisConfig,
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

  const donations = await Donation.find({
    where: {
      status: DONATION_STATUS.PENDING,
      isFiat: false,
    },
    select: ['id'],
  });
  logger.debug('Pending donations to be check', donations.length);
  donations.forEach(donation => {
    logger.debug('Add pending donation to queue', { donationId: donation.id });
    verifyDonationsQueue.add({
      donationId: donation.id,
    });
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
        await syncDonationStatusWithBlockchainNetwork(donationId);
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

const failedVerifiedDonationErrorMessages = [
  errorMessages.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY,
  errorMessages.INVALID_NETWORK_ID,
  errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
  errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
];
