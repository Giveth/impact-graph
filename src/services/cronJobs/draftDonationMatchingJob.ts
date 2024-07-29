import { schedule } from 'node-cron';
import config from '../../config.js';
import { logger } from '../../utils/logger.js';
import {
  countPendingDraftDonations,
  delecteExpiredDraftDonations,
} from '../../repositories/draftDonationRepository.js';

const cronJobTime =
  (config.get('MATCH_DRAFT_DONATION_CRONJOB_EXPRESSION') as string) ||
  '0 */5 * * *';

const TWO_MINUTES = 1000 * 60 * 2;

// Queue for filling snapshot balances

// Periodically log the queue count

export const runDraftDonationMatchWorkerJob = async () => {
  logger.debug('runDraftDonationMatchWorkerJob', cronJobTime);
  const hours = Number(process.env.DRAFT_DONATION_MATCH_EXPIRATION_HOURS || 48);
  schedule(cronJobTime, async () => {
    await delecteExpiredDraftDonations(hours);
    // await runDraftDonationMatchWorker();
  });

  // Execute first time when running
  await delecteExpiredDraftDonations(hours);
  // await runDraftDonationMatchWorker();
  setInterval(async () => {
    try {
      logger.debug(
        'Pending Draft Donations count: before execute the count query',
      );
      const count = await countPendingDraftDonations();
      logger.debug('Pending Draft Donations count:', { count });
    } catch (e) {
      logger.error('Pending Draft Donations count: Error', e);
    }
  }, TWO_MINUTES);
};
