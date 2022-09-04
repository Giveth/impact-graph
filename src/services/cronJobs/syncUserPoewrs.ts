import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import { syncDonationStatusWithBlockchainNetwork } from '../donationService';
import { schedule } from 'node-cron';
import { getGivPowerSubgraphAdapter } from '../../adapters/adaptersFactory';
import {
  findUsersThatDidntSyncTheirPower,
  insertNewUserPower,
} from '../../repositories/userPowerRepository';
import { findUserById } from '../../repositories/userRepository';
import { errorMessages } from '../../utils/errorMessages';

const syncUserPowersQueue = new Bull('verify-donations-queue', {
  redis: redisConfig,
});
const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const syncUserPowersQueueCount = await syncUserPowersQueue.count();
  logger.debug(`Sync user powers job queues count:`, {
    syncUserPowersQueueCount,
  });
}, TWO_MINUTES);

// As etherscan free plan support 5 request per second I think it's better the concurrent jobs should not be
// more than 5 with free plan https://etherscan.io/apis
const numberOfSyncUserPowersConcurrentJob =
  Number(config.get('NUMBER_OF_SYNC_USER_POWER_CONCURRENT_JOB')) || 1;

const cronJobTime =
  (config.get('SYNC_USER_POWER_CRONJOB_EXPRESSION') as string) || '0 0 * * * *';

export const runSyncUserPowersCronJob = () => {
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
  const firstGivbackRoundTimeStamp = Number(
    process.env.FIRST_GIVBACK_ROUND_TIME_STAMP,
  );
  const givbackRoundLength = 14 * 24 * 3600; // 14 days * 24 hours * 3600 seconds

  const now = Math.floor(new Date().getTime() / 1000);

  // use math.ceil because rounds starts from 1 not zero
  const currentGivbackRound = Math.ceil(
    (now - firstGivbackRoundTimeStamp) / givbackRoundLength,
  );

  const fromTimeStamp =
    (currentGivbackRound - 1) * givbackRoundLength + firstGivbackRoundTimeStamp;
  const toTimeStamp =
    currentGivbackRound * givbackRoundLength + firstGivbackRoundTimeStamp;

  const users = await findUsersThatDidntSyncTheirPower(currentGivbackRound);
  users.forEach(user => {
    syncUserPowersQueue.add({
      userId: user.id,
      fromTimeStamp,
      toTimeStamp,
      givbackRound: currentGivbackRound,
    });
  });
}

function processSyncUserPowerJobs() {
  logger.debug('processSyncUserPowerJobs() has been called');
  syncUserPowersQueue.process(
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
          fromTimestamp: new Date(fromTimestamp),
          toTimestamp: new Date(fromTimestamp),
          user,
          power: averagePower,
          givbackRound,
        });
      } catch (e) {
        logger.error('processSyncUserPowerJobs >> synUserPower error', e);
      } finally {
        done();
      }
    },
  );
}
