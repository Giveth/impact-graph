import { schedule } from 'node-cron';
import { updateOldStableCoinDonationsPrice } from '../donationService';
import { logger } from '../../utils/logger';
import config from '../../config';

const cronJobTime =
  (config.get('REVIEW_OLD_GIV_PRICES_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * *';

export const runUpdateDonationsWithoutValueUsdPrices = () => {
  logger.debug(
    'runUpdateDonationsWithoutValueUsdPrices() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    await updateOldStableCoinDonationsPrice();
  });
};
