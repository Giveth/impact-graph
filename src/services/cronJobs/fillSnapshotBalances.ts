import Bull from 'bull';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import config from '../../config';
import { schedule } from 'node-cron';
import { getGivPowerSubgraphAdapter } from '../../adapters/adaptersFactory';
import { getPowerBoostingSnapshotWithoutBalance } from '../../repositories/powerSnapshotRepository';
import { createPowerSnapshotBalances } from '../../repositories/powerBalanceSnapshotRepository';

const fillSnapshotBalanceQueue = new Bull<FillSnapShotBalanceData>(
  'fill-snapshot-balance',
  {
    redis: redisConfig,
  },
);
const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const fillSnapshotBalanceQueueCount = await fillSnapshotBalanceQueue.count();
  logger.debug(`Fill power snapshot balance queues count:`, {
    fillSnapshotBalanceQueueCount,
  });
}, TWO_MINUTES);

const numberOfFillPowerSnapshotBAlancesConcurrentJob =
  Number(
    config.get('NUMBER_OF_FILLING_POWER_SNAPSHOT_BALANCE_CONCURRENT_JOB'),
  ) || 1;

const cronJobTime =
  (config.get('FILL_POWER_SNAPSHOT_BALANCE_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * * *';

export const runSyncUserPowersCronJob = () => {
  logger.debug(
    'runSyncUserPowersCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  processFillPowerSnapshotJobs();
  // https://github.com/node-cron/node-cron#cron-syntax
  schedule(cronJobTime, async () => {
    await addFillPowerSnapshotBalanceJobsToQueue();
  });
};

export async function addFillPowerSnapshotBalanceJobsToQueue() {
  let offset = 0;
  let isFinished = false;

  const groupByBlockNumbers: {
    [p: number]: {
      userId: number;
      powerSnapshotId: number;
      walletAddress: string;
    }[];
  } = {};
  while (!isFinished) {
    const powerBoostings = await getPowerBoostingSnapshotWithoutBalance(
      50,
      offset,
    );
    offset += powerBoostings.length;
    if (powerBoostings.length === 0) {
      isFinished = true;
    }
    powerBoostings.forEach(pb => {
      if (groupByBlockNumbers[pb.blockNumber]) {
        groupByBlockNumbers[pb.blockNumber].push(pb);
      } else {
        groupByBlockNumbers[pb.blockNumber] = [pb];
      }
    });
  }
  Object.keys(groupByBlockNumbers).forEach(key => {
    fillSnapshotBalanceQueue.add({
      blockNumber: Number(key),
      data: groupByBlockNumbers[key],
    });
  });
}

export function processFillPowerSnapshotJobs() {
  logger.debug('processFillPowerSnapshotJobs() has been called');
  fillSnapshotBalanceQueue.process(
    numberOfFillPowerSnapshotBAlancesConcurrentJob,
    async (job, done) => {
      logger.debug('processing syncUserPower job', { jobData: job.data });
      const { blockNumber, data } = job.data;
      try {
        const balances =
          await getGivPowerSubgraphAdapter().getUserPowerBalanceInBlockNumber({
            blockNumber,
            walletAddresses: data.map(user =>
              user?.walletAddress?.toLowerCase(),
            ),
          });

        await createPowerSnapshotBalances(
          data.map(item => {
            return {
              balance: balances[item.walletAddress],
              powerSnapshotId: item.powerSnapshotId,
              userId: item.userId,
            };
          }),
        );
      } catch (e) {
        logger.error('processFillPowerSnapshotJobs >> synUserPower error', e);
      } finally {
        done();
      }
    },
  );
}

interface FillSnapShotBalanceData {
  blockNumber: number;
  data: {
    powerSnapshotId: number;
    userId: number;
    walletAddress: string;
  }[];
}
