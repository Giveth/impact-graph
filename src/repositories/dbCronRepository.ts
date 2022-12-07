import { Connection, getConnection } from 'typeorm';
import { CronJob } from '../entities/CronJob';
import { logger } from '../utils/logger';

export const POWER_BOOSTING_SNAPSHOT_TASK_NAME =
  'take givpower boosting snapshot';
export const POWER_BOOSTING_SNAPSHOT_HISTORY_TASK_NAME =
  'take givpower boosting snapshot history';
export const POWER_BALANCE_SNAPSHOT_HISTORY_TASK_NAME =
  'take givpower balance snapshot history';
export const POWER_SNAPSHOT_HISTORY_TASK_NAME =
  'take givpower snapshot history';

export const EVERY_MINUTE_CRON_JOB_EXPRESSION = '* * * * * *';
export const EVERY_YEAR_CRON_JOB_EXPRESSION = '0 0 1 1 *';

export const setupPgCronExtension = async () => {
  const connection = getConnection('cron');
  await connection.query(`
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;
  `);
};

export const schedulePowerBoostingSnapshot = async (
  cronJobExpression: string,
) => {
  const connection = getConnection('cron');
  await connection.query(`
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
  const connection = getConnection();
  await connection.query(`
    CALL public."TAKE_POWER_BOOSTING_SNAPSHOT_HISTORY"()
  `);
  await connection.query(`
    CALL public."TAKE_POWER_BALANCE_SNAPSHOT_HISTORY"()
  `);
  await connection.query(`
    CALL public."TAKE_POWER_SNAPSHOT_HISTORY"()
  `);
};

export const schedulePowerBoostingSnapshotHistory = async (
  cronJobExpression: string,
) => {
  const connection = getConnection('cron');
  await connection.query(`
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;

      SELECT CRON.SCHEDULE(
        '${POWER_BOOSTING_SNAPSHOT_HISTORY_TASK_NAME}',
        '${cronJobExpression}',
        $$CALL public."TAKE_POWER_BOOSTING_SNAPSHOT"()$$
      );
  `);
};

export const schedulePowerBalanceSnapshotHistory = async (
  cronJobExpression: string,
) => {
  const connection = getConnection('cron');
  await connection.query(`
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;

      SELECT CRON.SCHEDULE(
        '${POWER_BALANCE_SNAPSHOT_HISTORY_TASK_NAME}',
        '${cronJobExpression}',
        $$CALL public."TAKE_POWER_BOOSTING_SNAPSHOT"()$$
      );
  `);
};

export const schedulePowerSnapshotHistory = async (
  cronJobExpression: string,
) => {
  const connection = getConnection('cron');
  await connection.query(`
      CREATE EXTENSION IF NOT EXISTS PG_CRON;

      GRANT USAGE ON SCHEMA CRON TO POSTGRES;

      SELECT CRON.SCHEDULE(
        '${POWER_SNAPSHOT_HISTORY_TASK_NAME}',
        '${cronJobExpression}',
        $$CALL public."TAKE_POWER_BOOSTING_SNAPSHOT"()$$
      );
  `);
};

export const unSchedulePowerBoostingSnapshot = async () => {
  const connection = getConnection('cron');
  await connection.query(
    `SELECT cron.unschedule('${POWER_BOOSTING_SNAPSHOT_TASK_NAME}')`,
  );
};

export const getTakeSnapshotJobsAndCount = async (): Promise<
  [CronJob[], number]
> => {
  return await getConnection('cron')
    .createQueryBuilder(CronJob, 'job')
    .where('job.jobname = :jobName', {
      jobName: POWER_BOOSTING_SNAPSHOT_TASK_NAME,
    })
    .getManyAndCount();
};

export const dropDbCronExtension = async () => {
  const connection = getConnection('cron');
  await connection.query(`DROP EXTENSION IF EXISTS PG_CRON;`);
};
