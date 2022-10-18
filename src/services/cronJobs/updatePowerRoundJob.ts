import config from '../../config';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import { setPowerRound } from '../../repositories/powerRoundRepository';
import { getRoundNumberByDate } from '../../utils/powerBoostingUtils';
import { refreshProjectPowerView } from '../../repositories/projectPowerViewRepository';
import { refreshUserProjectPowerView } from '../../repositories/userProjectPowerViewRepository';

const cronJobTime =
  (config.get('UPDATE_POWER_ROUND_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * *';

export const runUpdatePowerRoundCronJob = () => {
  logger.debug(
    'runUpdatePowerRoundCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    const powerRound = getRoundNumberByDate(new Date()).round - 1;
    logger.debug('runUpdatePowerRoundCronJob powerRound', powerRound);
    await setPowerRound(powerRound);
    await refreshProjectPowerView();
    await refreshUserProjectPowerView();
  });
};
