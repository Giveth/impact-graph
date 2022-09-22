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

import { User } from '../../entities/user';
import { refreshUserProjectPowerView } from '../../repositories/userProjectPowerViewRepository';
import { refreshProjectPowerView } from '../../repositories/projectPowerViewRepository';
import { setPowerRound } from '../../repositories/powerRoundRepository';
import { getTimestampInSeconds } from '../../utils/utils';

const syncUserPowersQueue = new Bull<SyncUserPowersJobData>(
  'verify-userPower-queue',
  {
    redis: redisConfig,
  },
);
const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const syncUserPowersQueueCount = await syncUserPowersQueue.count();
  logger.debug(`Sync user powers job queues count:`, {
    syncUserPowersQueueCount,
  });
}, TWO_MINUTES);

const refreshUserProjectPowerViewsInterval = process.env
  .REFRESH_USER_PROJECT_POWER_VIEW_MINUTESS
  ? Number(process.env.REFRESH_USER_PROJECT_POWER_VIEW_MINUTESS) * 1000 * 60
  : TWO_MINUTES;

setInterval(async () => {
  logger.debug('Refreshing userProjectPower and projectpower table');
  await refreshProjectPowerView();
  await refreshUserProjectPowerView();
}, refreshUserProjectPowerViewsInterval);

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

export const getPreviousGivbackRoundInfo = (): {
  previousGivbackRound: number;
  fromTimestamp: number;
  toTimestamp: number;
} => {
  return getRoundNumberByDate(new Date());
};

export const getRoundNumberByDate = (
  date: Date,
): {
  previousGivbackRound: number;
  fromTimestamp: number;
  toTimestamp: number;
} => {
  const firstGivbackRoundTimeStamp = Number(
    process.env.FIRST_GIVBACK_ROUND_TIME_STAMP,
  );
  const givbackRoundLength = Number(process.env.GIVPOWER_ROUND_DURATION);

  const now = getTimestampInSeconds(date);

  // use math.ceil because rounds starts from 1 not zero
  const previousGivbackRound = Math.ceil(
    (now - firstGivbackRoundTimeStamp) / givbackRoundLength,
  );

  const fromTimestamp =
    (previousGivbackRound - 1) * givbackRoundLength +
    firstGivbackRoundTimeStamp;
  const toTimestamp =
    previousGivbackRound * givbackRoundLength + firstGivbackRoundTimeStamp;
  return {
    previousGivbackRound,
    fromTimestamp,
    toTimestamp,
  };
};

export async function addSyncUserPowerJobsToQueue() {
  const { previousGivbackRound, fromTimestamp, toTimestamp } =
    getPreviousGivbackRoundInfo();

  let totalFetched = 0;
  let users: User[] = [];
  let count = 0;
  const jobDatas: SyncUserPowersJobData[] = [];
  do {
    [users, count] = await findUsersThatDidntSyncTheirPower(
      previousGivbackRound,
      totalFetched,
    );
    totalFetched += users.length;
    logger.info('addSyncUserPowerJobsToQueue ', {
      count,
      totalFetched,
      previousGivbackRound,
      usersLength: users.length,
    });
    jobDatas.push({
      users,
      fromTimestamp,
      toTimestamp,
      givbackRound: previousGivbackRound,
    });
  } while (totalFetched < count);
  jobDatas.forEach(jobData => {
    syncUserPowersQueue.add(jobData);
  });
}

export function processSyncUserPowerJobs() {
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
            walletAddresses: users.map(user => user.walletAddress as string),
          });

        await insertNewUserPowers({
          fromTimestamp: new Date(fromTimestamp * 1000),
          toTimestamp: new Date(toTimestamp * 1000),
          averagePowers,
          givbackRound,
          users,
        });
        const remainingJobsCount = await syncUserPowersQueue.count();
        if (remainingJobsCount === 0) {
          await setPowerRound(givbackRound);
          // We know there is not any sync userPower jobs , so we refresh DB views
          await refreshUserProjectPowerView();
          await refreshProjectPowerView();
        }

        logger.debug('inserting userPowers...', {
          usersLength: users.length,
          remainingJobsCount,
        });
      } catch (e) {
        logger.error('processSyncUserPowerJobs >> synUserPower error', e);
      } finally {
        done();
      }
    },
  );
}

interface SyncUserPowersJobData {
  users: User[];
  fromTimestamp: number;
  toTimestamp: number;
  givbackRound: number;
}
