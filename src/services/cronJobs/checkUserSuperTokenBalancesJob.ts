import { schedule } from 'node-cron';
import config from '../../config.js';
import { logger } from '../../utils/logger.js';
import {
  processRecurringDonationBalancesJobs,
  runCheckUserSuperTokenBalances,
} from './checkUserSuperTokenBalancesQueue.js';

const cronJobTime =
  (config.get('CHECK_USERS_SUPER_TOKEN_BALANCES_CRONJOB_TIME') as string) ||
  '0 0 * * *'; // one day at 00:00

export const runCheckUserSuperTokenBalancesJob = () => {
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
