import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { isCronJobEnabledOrLog } from '../../utils/cronJobEnabled';
import {
  processRecurringDonationBalancesJobs,
  runCheckUserSuperTokenBalances,
} from './checkUserSuperTokenBalancesQueue';

const cronJobTime =
  (config.get('CHECK_USERS_SUPER_TOKEN_BALANCES_CRONJOB_TIME') as string) ||
  '0 0 * * *'; // one day at 00:00

export const runCheckUserSuperTokenBalancesJob = () => {
  if (
    !isCronJobEnabledOrLog(
      'ENABLE_CHECK_USERS_SUPER_TOKEN_BALANCES_CRONJOB',
      'Check users super token balances',
    )
  ) {
    return;
  }
  logger.debug(
    'runCheckUserSuperTokenBalancesJob() has been called, cronJobTime',
    cronJobTime,
  );
  processRecurringDonationBalancesJobs();

  schedule(cronJobTime, async () => {
    logger.debug('runCheckUserSuperTokenBalancesJob() has been started');
    try {
      await runCheckUserSuperTokenBalances();
    } catch (error) {
      logger.error('runCheckUserSuperTokenBalancesJob() error', error);
    }
    logger.debug('runCheckUserSuperTokenBalancesJob() has been finished');
  });
};
