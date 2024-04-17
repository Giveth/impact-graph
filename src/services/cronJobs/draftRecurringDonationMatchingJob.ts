import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import {
  DRAFT_RECURRING_DONATION_STATUS,
  DraftRecurringDonation,
} from '../../entities/draftRecurringDonation';
import { runDraftRecurringDonationMatchWorker } from '../chains/evm/draftRecurringDonationService';
import { deleteExpiredDraftRecurringDonations } from '../../repositories/draftRecurringDonationRepository';

const cronJobTime =
  (config.get('MATCH_DRAFT_DONATION_CRONJOB_EXPRESSION') as string) ||
  '0 */5 * * *';

const TWO_MINUTES = 1000 * 60 * 2;

// Queue for filling snapshot balances

// Periodically log the queue count

export const runDraftRecurringDonationMatchWorkerJob = () => {
  logger.debug('runDraftRecurringDonationMatchWorkerJob', cronJobTime);

  schedule(cronJobTime, async () => {
    const hours = Number(
      process.env.DRAFT_RECURRING_DONATION_MATCH_EXPIRATION_HOURS || 48,
    );
    await deleteExpiredDraftRecurringDonations(hours);
    await runDraftRecurringDonationMatchWorker();
  });

  setInterval(async () => {
    const count = await DraftRecurringDonation.countBy({
      status: DRAFT_RECURRING_DONATION_STATUS.PENDING,
    });
    logger.debug('Pending Draft Recurring Donations count:', { count });
  }, TWO_MINUTES);
};
