import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { syncDonationsWithIndexerData } from '../../scripts/syncDataWithInverter';

const cronJobTime =
  (config.get('SYNC_DATA_WITH_INVERTER_CRONJOB_EXPRESSION') as string) ||
  '*/7 * * * *'; // every 7 minutes

export const runSyncDataWithInverter = async () => {
  logger.debug(
    'runSyncDataWithInverter() has been called, cronJobTime',
    cronJobTime,
  );
  await syncDonationsWithIndexerData();
  schedule(cronJobTime, async () => {
    await syncDonationsWithIndexerData();
  });
};
