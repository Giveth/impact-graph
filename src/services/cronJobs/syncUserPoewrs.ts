import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import { syncDonationStatusWithBlockchainNetwork } from '../donationService';
import { schedule } from 'node-cron';
import { getGivPowerSubgraphAdapter } from '../../adapters/adaptersFactory';
import { insertNewUserPower } from '../../repositories/userPowerRepository';
import { findUserById } from '../../repositories/userRepository';
import { errorMessages } from '../../utils/errorMessages';

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
const numberOfSyncUserPowersConcurrentJob =
  Number(config.get('NUMBER_OF_SYNC_USER_POWER_CONCURRENT_JOB')) || 1;

const cronJobTime =
  (config.get('SYNC_USER_POWER_CRONJOB_EXPRESSION') as string) || '0 0 * * * *';

export const runCheckPendingDonationsCronJob = () => {
  logger.debug(
    'runSyncUserPowersCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  processSyncUserPowerJobs();
  // https://github.com/node-cron/node-cron#cron-syntax
  schedule(cronJobTime, async () => {
    await addSyncUserPowerJobsToQueue();
  });
};

async function addSyncUserPowerJobsToQueue() {
  // TODO should calculate givbackRound
  const givbackRound = 1;
}

function processSyncUserPowerJobs() {
  logger.debug('processVerifyDonationsJobs() has been called');
  verifyDonationsQueue.process(
    numberOfSyncUserPowersConcurrentJob,
    async (job, done) => {
      const { userId, fromTimestamp, toTimestamp, givbackRound } = job.data;
      logger.debug('processing syncUserPower job', { jobData: job.data });
      try {
        const user = await findUserById(userId);
        if (!user) {
          throw new Error(errorMessages.USER_NOT_FOUND);
        }
        const averagePower =
          await getGivPowerSubgraphAdapter().getUserPowerInTimeRange({
            fromTimestamp,
            toTimestamp,
            walletAddress: user.walletAddress as string,
          });
        await insertNewUserPower({
          fromTimestamp,
          toTimestamp,
          user,
          power: averagePower,
          givbackRound,
        });
      } catch (e) {
        logger.error(
          'processVerifyDonationsJobs >> syncDonationStatusWithBlockchainNetwork error',
          e,
        );
      } finally {
        done();
      }
    },
  );
}
