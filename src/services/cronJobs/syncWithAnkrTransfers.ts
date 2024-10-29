import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { syncDonationsWithAnkr } from '../donationService';

// As etherscan free plan support 5 request per second I think it's better the concurrent jobs should not be
// more than 5 with free plan https://etherscan.io/apis
const cronJobTime =
  (config.get('ANKR_SYNC_CRONJOB_EXPRESSION') as string) || '*/5 * * * *'; // every 5 minutes starting from 4th minute

export const runSyncWithAnkrTransfers = async () => {
  logger.debug(
    'runSyncWithAnkrTrancers() has been called, cronJobTime',
    cronJobTime,
  );
  await syncDonationsWithAnkr();
  schedule(cronJobTime, async () => {
    await syncDonationsWithAnkr();
  });
};
