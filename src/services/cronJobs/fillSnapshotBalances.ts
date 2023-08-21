import Bull from 'bull';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import config from '../../config';
import { schedule } from 'node-cron';
import { getPowerBalanceAggregatorAdapter } from '../../adapters/adaptersFactory';
import {
  getPowerBoostingSnapshotWithoutBalance,
  GetPowerBoostingSnapshotWithoutBalanceOutput,
} from '../../repositories/powerSnapshotRepository';
import { addOrUpdatePowerSnapshotBalances } from '../../repositories/powerBalanceSnapshotRepository';
import { convertTimeStampToSeconds } from '../../utils/utils';

// Constants
const FILL_SNAPSHOT_BALANCE_QUEUE_NAME = 'fill-snapshot-balance-aggregator';
const TWO_MINUTES = 1000 * 60 * 2;
const DEFAULT_CRON_JOB_TIME = '0 0 * * * *';
const DEFAULT_CONCURRENT_JOB_COUNT = 1;

// Queue for filling snapshot balances
const fillSnapshotBalanceQueue = new Bull<FillSnapShotBalanceData>(
  FILL_SNAPSHOT_BALANCE_QUEUE_NAME,
  { redis: redisConfig },
);

// Periodically log the queue count
setInterval(async () => {
  const count = await fillSnapshotBalanceQueue.count();
  logger.debug('Fill power snapshot balance queues count:', { count });
}, TWO_MINUTES);

const numberOfFillPowerSnapshotBalancesConcurrentJob = Number(
  config.get('NUMBER_OF_FILLING_POWER_SNAPSHOT_BALANCE_CONCURRENT_JOB') ||
    DEFAULT_CONCURRENT_JOB_COUNT,
);

const cronJobTime =
  (config.get('FILL_POWER_SNAPSHOT_BALANCE_CRONJOB_EXPRESSION') as string) ||
  DEFAULT_CRON_JOB_TIME;

export const runFillPowerSnapshotBalanceCronJob = () => {
  logger.debug(
    'runSyncUserPowersCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  processFillPowerSnapshotJobs();

  // Schedule cron job to add jobs to queue
  schedule(cronJobTime, async () => {
    await addFillPowerSnapshotBalanceJobsToQueue();
  });
};

async function isBalanceAggregatorSynced(): Promise<boolean> {
  const leastIndexedBlockTimestamp =
    await getPowerBalanceAggregatorAdapter().getLeastIndexedBlockTimeStamp({});
  const now = convertTimeStampToSeconds(new Date().getTime());
  const threshold = Number(
    process.env.BALANCE_AGGREGATOR_LAST_UPDATE_THRESHOLD_IN_SECONDS,
  );
  return now - leastIndexedBlockTimestamp <= threshold;
}

export async function addFillPowerSnapshotBalanceJobsToQueue() {
  if (!(await isBalanceAggregatorSynced())) {
    logger.error('The balance aggregator is not synced ', {
      now: new Date(),
      balanceAggregatorLastUpdatedTime: new Date(
        (await getPowerBalanceAggregatorAdapter().getLeastIndexedBlockTimeStamp(
          {},
        )) * 1000,
      ),
    });
    return;
  }

  const groupByTimestamp: Record<
    number,
    {
      userId: number;
      powerSnapshotId: number;
      walletAddress: string;
    }[]
  > = {};

  let offset = 0;
  let powerBoostings: GetPowerBoostingSnapshotWithoutBalanceOutput[] = [];
  do {
    powerBoostings = await getPowerBoostingSnapshotWithoutBalance(100, offset);
    powerBoostings.forEach(pb => {
      const timestampInStr = String(pb.time.getTime());
      groupByTimestamp[timestampInStr] = groupByTimestamp[timestampInStr] || [];
      groupByTimestamp[timestampInStr].push(pb);
    });
    offset += powerBoostings.length;
  } while (powerBoostings.length);

  for (const [key, value] of Object.entries(groupByTimestamp)) {
    const powerSnapshotId = value[0].powerSnapshotId;
    const jobData = {
      timestamp: convertTimeStampToSeconds(Number(key)),
      powerSnapshotId,
      data: value.map(pb => ({
        userId: pb.userId,
        walletAddress: pb.walletAddress.toLowerCase(),
      })),
    };
    fillSnapshotBalanceQueue.add(jobData);
  }
}

export function processFillPowerSnapshotJobs() {
  fillSnapshotBalanceQueue.process(
    numberOfFillPowerSnapshotBalancesConcurrentJob,
    async (job, done) => {
      try {
        const { timestamp, powerSnapshotId, data } = job.data;
        const addresses = data.map(item => item.walletAddress);
        const batchNumber = Number(
          process.env.NUMBER_OF_BALANCE_AGGREGATOR_BATCH,
        );

        // Process in batches
        for (let i = 0; i < Math.ceil(addresses.length / batchNumber); i++) {
          const batch = addresses.slice(i * batchNumber, (i + 1) * batchNumber);
          const balances =
            await getPowerBalanceAggregatorAdapter().getAddressesBalance({
              timestamp,
              addresses: batch,
            });

          await addOrUpdatePowerSnapshotBalances(
            balances.map(balance => {
              const correspondingItem = data.find(
                item =>
                  item.walletAddress.toLowerCase() ===
                  balance.address.toLowerCase(),
              );
              return {
                balance: balance.balance,
                powerSnapshotId,
                userId: correspondingItem!.userId,
              };
            }),
          );
        }
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
