import Bull from 'bull';
import { schedule } from 'node-cron';
import _ from 'lodash';
import { redisConfig } from '../../redis';
import { logger } from '../../utils/logger';
import config from '../../config';
import { getPowerBalanceAggregatorAdapter } from '../../adapters/adaptersFactory';
import {
  getPowerBoostingSnapshotWithoutBalance,
  GetPowerBoostingSnapshotWithoutBalanceOutput,
} from '../../repositories/powerSnapshotRepository';
import { addOrUpdatePowerSnapshotBalances } from '../../repositories/powerBalanceSnapshotRepository';

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

export async function addFillPowerSnapshotBalanceJobsToQueue() {
  const balanceAggregatorLastUpdatedTime =
    await getPowerBalanceAggregatorAdapter().getLeastIndexedBlockTimeStamp({});

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
  const snapshotTimestampsAheadOfBalanceAggregator = new Set<number>();
  do {
    powerBoostings = await getPowerBoostingSnapshotWithoutBalance(100, offset);
    powerBoostings.forEach(pb => {
      if (pb.timestamp > balanceAggregatorLastUpdatedTime) {
        snapshotTimestampsAheadOfBalanceAggregator.add(pb.timestamp);
        return;
      }

      const timestampInStr = String(pb.timestamp);
      groupByTimestamp[timestampInStr] = groupByTimestamp[timestampInStr] || [];
      groupByTimestamp[timestampInStr].push(pb);
    });
    offset += powerBoostings.length;
  } while (powerBoostings.length);

  // log for each item in the set
  snapshotTimestampsAheadOfBalanceAggregator.forEach(timestamp => {
    logger.error('The balance aggregator has not synced to snapshot point ', {
      snapshotTime: new Date(timestamp * 1000),
      balanceAggregatorLastUpdatedDate: new Date(
        balanceAggregatorLastUpdatedTime * 1000,
      ),
    });
  });

  for (const [key, value] of Object.entries(groupByTimestamp)) {
    const jobData = {
      timestamp: +key,
      data: value.map(pb => ({
        userId: pb.userId,
        powerSnapshotId: pb.powerSnapshotId,
        walletAddress: pb.walletAddress.toLowerCase(),
      })),
    };
    fillSnapshotBalanceQueue.add(jobData, {
      jobId: `${FILL_SNAPSHOT_BALANCE_QUEUE_NAME}-${key}`,
    });
  }
}

export function processFillPowerSnapshotJobs() {
  fillSnapshotBalanceQueue.process(
    numberOfFillPowerSnapshotBalancesConcurrentJob,
    async (job, done) => {
      try {
        const { timestamp, data } = job.data;
        const batchNumber = Number(
          process.env.NUMBER_OF_BALANCE_AGGREGATOR_BATCH || 20,
        );

        // Process in batches
        for (let i = 0; i < Math.ceil(data.length / batchNumber); i++) {
          const batch = data.slice(i * batchNumber, (i + 1) * batchNumber);
          const addressesToFetch = new Set<string>(
            batch.map(item => item.walletAddress),
          );
          const balances =
            await getPowerBalanceAggregatorAdapter().getAddressesBalance({
              timestamp,
              addresses: Array.from(addressesToFetch),
            });

          const groupByWalletAddress = _.groupBy(batch, item =>
            item.walletAddress.toLowerCase(),
          );

          const snapshotBalances = balances.map(balance => {
            const address = balance.address.toLowerCase();

            // Remove the address from the set
            addressesToFetch.delete(address);

            return groupByWalletAddress[address].map(item => ({
              balance: balance.balance,
              powerSnapshotId: item.powerSnapshotId,
              userId: item!.userId,
            }));
          });

          // Fill zero for the missing balances
          for (const missedAddress of addressesToFetch) {
            snapshotBalances.push(
              groupByWalletAddress[missedAddress].map(item => ({
                balance: 0,
                powerSnapshotId: item.powerSnapshotId,
                userId: item.userId,
              })),
            );
          }

          await addOrUpdatePowerSnapshotBalances(snapshotBalances.flat());
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
  data: {
    userId: number;
    powerSnapshotId: number;
    walletAddress: string;
  }[];
}
