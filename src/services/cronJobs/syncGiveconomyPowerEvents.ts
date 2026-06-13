import cron from 'node-cron';
import { pullGiveconomyPowerSync } from '../giveconomyPowerSyncService';
import { logger } from '../../utils/logger';

let isGiveconomyPowerSyncRunning = false;

export const runGiveconomyPowerSyncCronJob = () => {
  const cronExpression =
    process.env.GIVECONOMY_POWER_SYNC_CRON_EXPRESSION || '*/1 * * * *';
  if (process.env.DISABLE_GIVECONOMY_POWER_SYNC_JOB !== 'false') {
    logger.info('GIVeconomy power sync cron job is disabled by configuration');
    return;
  }
  if (!process.env.GIVECONOMY_POWER_SYNC_URL) {
    logger.info('GIVeconomy power sync cron job is disabled');
    return;
  }
  if (!process.env.POWER_SYNC_PASSWORD) {
    logger.warn(
      'GIVeconomy power sync cron job is disabled because POWER_SYNC_PASSWORD is missing',
    );
    return;
  }
  if (!cron.validate(cronExpression)) {
    logger.error('Invalid GIVeconomy power sync cron expression', {
      cronExpression: process.env.GIVECONOMY_POWER_SYNC_CRON_EXPRESSION,
    });
    return;
  }

  cron.schedule(cronExpression, async () => {
    if (isGiveconomyPowerSyncRunning) {
      logger.warn(
        'Skipping GIVeconomy power sync because previous run is active',
      );
      return;
    }

    isGiveconomyPowerSyncRunning = true;
    try {
      await pullGiveconomyPowerSync();
    } catch (error) {
      logger.error('GIVeconomy power sync cron job failed', error);
    } finally {
      isGiveconomyPowerSyncRunning = false;
    }
  });

  logger.info('GIVeconomy power sync cron job scheduled', {
    cronExpression,
  });
};
