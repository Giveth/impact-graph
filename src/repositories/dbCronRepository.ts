import { CronJob } from '../entities/CronJob';
import { logger } from '../utils/logger';
import { AppDataSource, CronDataSource } from '../orm';

export const POWER_BOOSTING_SNAPSHOT_TASK_NAME =
  'take givpower boosting snapshot';
export const ARCHIVE_POWER_SNAPSHOTS_TASK_NAME = 'archive givpower snapshots';

export const EVERY_MINUTE_CRON_JOB_EXPRESSION = '* * * * * *';
export const EVERY_YEAR_CRON_JOB_EXPRESSION = '0 0 1 1 *';

export const setupPgCronExtension = async () => {
  await CronDataSource.getDataSource().query(`
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;
  `);
};

export const schedulePowerBoostingSnapshot = async (
  cronJobExpression: string,
) => {
  await CronDataSource.getDataSource().query(`
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;

      SELECT CRON.SCHEDULE(
        '${POWER_BOOSTING_SNAPSHOT_TASK_NAME}',
        '${cronJobExpression}',
        $$CALL public."TAKE_POWER_BOOSTING_SNAPSHOT"()$$
      );
  `);
};

export const invokeGivPowerHistoricProcedures = async () => {
  const queryRunner = AppDataSource.getDataSource().createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await queryRunner.query(`
      CALL public."ARCHIVE_POWER_BOOSTING_OLD_SNAPSHOT_DATA"()
    `);
    await queryRunner.commitTransaction();
  } catch (e) {
    logger.error('invokeGivPowerHistoricProcedures() error', e);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
  }
};

export const schedulePowerSnapshotsHistory = async (
  cronJobExpression: string,
) => {
  await CronDataSource.getDataSource().query(`
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;

      SELECT CRON.SCHEDULE(
        '${ARCHIVE_POWER_SNAPSHOTS_TASK_NAME}',
        '${cronJobExpression}',
        $$CALL public."ARCHIVE_POWER_BOOSTING_OLD_SNAPSHOT_DATA"()$$
      );
  `);
};

export const unSchedulePowerBoostingSnapshot = async () => {
  await CronDataSource.getDataSource().query(
    `SELECT cron.unschedule('${POWER_BOOSTING_SNAPSHOT_TASK_NAME}')`,
  );
};

export const getTakeSnapshotJobsAndCount = async (): Promise<
  [CronJob[], number]
> => {
  return await CronDataSource.getDataSource()
    .createQueryBuilder(CronJob, 'job')
    .where('job.jobname = :jobName', {
      jobName: POWER_BOOSTING_SNAPSHOT_TASK_NAME,
    })
    .getManyAndCount();
};

export const dropDbCronExtension = async () => {
  await CronDataSource.getDataSource().query(
    `DROP EXTENSION IF EXISTS PG_CRON;`,
  );
};
