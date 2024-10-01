import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { fillMissingTokenPriceInEarlyAccessRounds } from '../../repositories/earlyAccessRoundRepository';
import { fillMissingTokenPriceInQfRounds } from '../../repositories/qfRoundRepository';

// As etherscan free plan support 5 request per second I think it's better the concurrent jobs should not be
// more than 5 with free plan https://etherscan.io/apis
const cronJobTime =
  (config.get('QACC_FETCH_ROUND_TOKEN_PRICE_CRONJOB_EXPRESSION') as string) ||
  '0 */5 * * * *';

export const runFetchRoundTokenPrice = async () => {
  logger.debug(
    'runCheckPendingDonationsCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  await fillMissingTokenPriceInEarlyAccessRounds();
  await fillMissingTokenPriceInQfRounds();
  // https://github.com/node-cron/node-cron#cron-syntax
  schedule(cronJobTime, async () => {
    fillMissingTokenPriceInEarlyAccessRounds();
    fillMissingTokenPriceInQfRounds();
  });
};
