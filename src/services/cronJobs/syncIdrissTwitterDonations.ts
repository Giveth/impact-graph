import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { getTwitterDonations } from '../Idriss/contractDonations';

const cronJobTime =
  (config.get('SYNC_IDRISS_TWITTER_DONATIONS_CRONJOB_EXPRESSION') as string) ||
  '*/20 * * * *';

export const runSyncIdrissTwitterDonations = () => {
  logger.debug(
    'runSyncIdrissTwitterDonations() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    await getTwitterDonations();
  });
};
