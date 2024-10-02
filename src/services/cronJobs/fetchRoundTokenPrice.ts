import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { fillMissingTokenPriceInEarlyAccessRounds } from '../../repositories/earlyAccessRoundRepository';
import { fillMissingTokenPriceInQfRounds } from '../../repositories/qfRoundRepository';

// As etherscan free plan support 5 request per second I think it's better the concurrent jobs should not be
// more than 5 with free plan https://etherscan.io/apis
const cronJobTime =
  (config.get('QACC_FETCH_ROUND_TOKEN_PRICE_CRONJOB_EXPRESSION') as string) ||
  '*/5 * * * *'; // every 5 minutes starting from 4th minute

export const runFetchRoundTokenPrice = async () => {
  logger.debug(
    'runFetchRoundTokenPrice() has been called, cronJobTime',
    cronJobTime,
  );
  await fillMissingTokenPriceInEarlyAccessRounds();
  await fillMissingTokenPriceInQfRounds();
  schedule(cronJobTime, async () => {
    await Promise.all([
      fillMissingTokenPriceInEarlyAccessRounds(),
      fillMissingTokenPriceInQfRounds(),
    ]);
  });
};
