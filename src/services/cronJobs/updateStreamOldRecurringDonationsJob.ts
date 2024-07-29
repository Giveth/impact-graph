import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import {
  processRecurringDonationStreamJobs,
  updateRecurringDonationsStream,
} from '../recurringDonationStreamQueue';

const cronJobTime =
  (config.get('UPDATE_RECURRING_DONATIONS_STREAM_CRONJOB') as string) ||
  '0 0 * * *'; // every day at 00:00

export const runUpdateRecurringDonationStream = () => {
  logger.debug(
    'runUpdateRecurringDonationStream() has been called, cronJobTime',
    cronJobTime,
  );
  processRecurringDonationStreamJobs();
  schedule(cronJobTime, async () => {
    logger.debug('runUpdateRecurringDonationStream() has been started');
    try {
      await updateRecurringDonationsStream();
    } catch (error) {
      logger.error('runUpdateRecurringDonationStream() error', error);
    }
    logger.debug('runUpdateRecurringDonationStream() has been finished');
  });
};
