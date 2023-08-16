import Bull from 'bull';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import config from '../../config';
import { schedule } from 'node-cron';
import {
  getGivPowerSubgraphAdapter,
  getPowerBalanceAggregatorAdapter,
} from '../../adapters/adaptersFactory';
import { getPowerBoostingSnapshotWithoutBalance } from '../../repositories/powerSnapshotRepository';
import { addOrUpdatePowerSnapshotBalances } from '../../repositories/powerBalanceSnapshotRepository';

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

export const runFillPowerSnapshotBalanceCronJob = () => {
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

  const groupByTimestamp: {
    [timestamp: number]: {
      userId: number;
      powerSnapshotId: number;
      walletAddress: string;
    }[];
  } = {};

  while (!isFinished) {
    const powerBoostings = await getPowerBoostingSnapshotWithoutBalance(
      20,
      offset,
    );
    powerBoostings.forEach(pb => {
      const timestampInStr = String(Math.floor(pb.time.getTime() / 1000));
      if (groupByTimestamp[timestampInStr]) {
        groupByTimestamp[timestampInStr].push(pb);
      } else {
        groupByTimestamp[timestampInStr] = [pb];
      }
    });
    logger.debug('Trying to fill incomplete powerBoostingSnapshots', {
      offset,
      powerBoostingsLength: powerBoostings?.length,
    });
    offset += powerBoostings.length;
    if (powerBoostings.length === 0) {
      isFinished = true;
    }
    Object.keys(groupByTimestamp).forEach(key => {
      fillSnapshotBalanceQueue.add({
        timestamp: Number(key),
        powerSnapshotId: powerBoostings[0].powerSnapshotId,
        data: powerBoostings.map(pb => {
          return {
            userId: pb.userId,
            walletAddress: pb.walletAddress.toLowerCase(),
          };
        }),
      });
    });
  }
}

export function processFillPowerSnapshotJobs() {
  logger.debug('processFillPowerSnapshotJobs() has been called ', {
    numberOfFillPowerSnapshotBAlancesConcurrentJob,
  });
  fillSnapshotBalanceQueue.process(
    numberOfFillPowerSnapshotBAlancesConcurrentJob,
    async (job, done) => {
      logger.debug('processing fill powerSnapshot job', job.data);
      const items = job.data.data;
      const { timestamp, powerSnapshotId } = job.data;
      try {
        const addresses = items.map(item => item.walletAddress).join(',');
        const balances =
          await getPowerBalanceAggregatorAdapter().getBalanceOfAddresses({
            timestamp,
            addresses,
          });

        await addOrUpdatePowerSnapshotBalances(
          balances.map(balance => {
            return {
              balance: balance.balance,
              powerSnapshotId,
              userId: items.find(
                item =>
                  item.walletAddress.toLowerCase() ===
                  balance.address.toLowerCase(),
              )!.userId,
            };
          }),
        );
      } catch (e) {
        logger.error('processFillPowerSnapshotJobs >> error', e);
      } finally {
        done();
      }
    },
  );
}

interface FillSnapShotBalanceData {
  timestamp: number;
  powerSnapshotId: number;
  data: {
    userId: number;
    walletAddress: string;
  }[];
}
