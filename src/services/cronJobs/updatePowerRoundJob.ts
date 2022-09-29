import config from '../../config';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import { setPowerRound } from '../../repositories/powerRoundRepository';
import { getRoundNumberByDate } from '../../utils/powerBoostingUtils';

const cronJobTime =
  (config.get('UPDATE_POWER_ROUND_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * *';

export const runUpdatePowerRoundCronJob = () => {
  logger.debug(
    'runUpdatePowerRoundCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    const roundNumber = getRoundNumberByDate(new Date()).previousGivbackRound;
    logger.debug('runUpdatePowerRoundCronJob roundNumber', roundNumber);
    await setPowerRound(roundNumber);
  });
};
