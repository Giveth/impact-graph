import { logger } from '../utils/logger';
import { CronDataSource } from '../orm';

export const dropDbCronExtension = async () => {
  try {
    await CronDataSource.getDataSource().query(
      `DROP EXTENSION IF EXISTS PG_CRON;`,
    );
  } catch (e) {
    logger.error('dropDbCronExtension() error', e);
  }
};
