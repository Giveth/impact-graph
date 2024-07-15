import { schedule } from 'node-cron';
import config from '../../config.js';
import { logger } from '../../utils/logger.js';
import { updateInstantBoosting } from '../instantBoostingServices.js';

const cronJobTime =
  (config.get('INSTANT_BOOSTING_UPDATE_CRONJOB_EXPRESSION') as string) ||
  '0 */5 * * *';

export const runInstantBoostingUpdateCronJob = () => {
  logger.debug(
    'runRefreshInstantBoostingRefreshCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    await updateInstantBoosting();
  });
};
