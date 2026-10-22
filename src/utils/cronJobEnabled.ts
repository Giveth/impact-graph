import config from '../config';
import { logger } from './logger';

/**
 * Strict opt-in switch for cron jobs: only the exact string 'true' enables a job.
 * Any other value (undefined, 'false', 'TRUE', '1', ...) disables it.
 */
export const isCronJobEnabled = (envKey: string): boolean =>
  config.get(envKey) === 'true';

/**
 * Returns true when the job's env switch is exactly 'true'; otherwise logs
 * that the job is disabled and returns false, so callers can `return` early.
 */
export const isCronJobEnabledOrLog = (
  envKey: string,
  jobName: string,
): boolean => {
  if (isCronJobEnabled(envKey)) {
    return true;
  }
  logger.info(`${jobName} cron job is disabled (${envKey} is not "true")`);
  return false;
};
