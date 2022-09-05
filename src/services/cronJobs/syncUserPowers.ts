import Bull from 'bull';
import config from '../../config';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import { getGivPowerSubgraphAdapter } from '../../adapters/adaptersFactory';
import {
  findUsersThatDidntSyncTheirPower,
  insertNewUserPowers,
} from '../../repositories/userPowerRepository';
import {
  findUserById,
  findUserByWalletAddress,
} from '../../repositories/userRepository';
import { errorMessages } from '../../utils/errorMessages';
import { User } from '../../entities/user';

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
  const givbackRoundLength = Number(process.env.GIVPOWER_ROUND_DURATION);

  const now = Math.floor(new Date().getTime() / 1000);

  // use math.ceil because rounds starts from 1 not zero
  const previousGivbackRound = Math.ceil(
    (now - firstGivbackRoundTimeStamp) / givbackRoundLength,
  );

  const fromTimeStamp =
    (previousGivbackRound - 1) * givbackRoundLength +
    firstGivbackRoundTimeStamp;
  const toTimeStamp =
    previousGivbackRound * givbackRoundLength + firstGivbackRoundTimeStamp;

  let totalFetched = 0;
  let users: User[] = [];
  let count = 0;

  do {
    [users, count] = await findUsersThatDidntSyncTheirPower(
      previousGivbackRound,
      totalFetched,
    );

    syncUserPowersQueue.add({
      users,
      fromTimeStamp,
      toTimeStamp,
      givbackRound: previousGivbackRound,
    });

    totalFetched += users.length;
  } while (totalFetched < count);
}

function processSyncUserPowerJobs() {
  logger.debug('processSyncUserPowerJobs() has been called');
  syncUserPowersQueue.process(
    numberOfSyncUserPowersConcurrentJob,
    async (job, done) => {
      const { users, fromTimestamp, toTimestamp, givbackRound } = job.data;
      logger.debug('processing syncUserPower job', { jobData: job.data });
      try {
        const averagePowers =
          await getGivPowerSubgraphAdapter().getUserPowerInTimeRange({
            fromTimestamp,
            toTimestamp,
            walletAddresses: users.map(user => user.walletAddress),
          });
        await insertNewUserPowers({
          fromTimestamp: new Date(fromTimestamp),
          toTimestamp: new Date(fromTimestamp),
          averagePowers,
          givbackRound,
          users,
        });
      } catch (e) {
        logger.error('processSyncUserPowerJobs >> synUserPower error', e);
      } finally {
        done();
      }
    },
  );
}
