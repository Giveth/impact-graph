import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { runDraftDonationMatchWorker } from '../chains/evm/draftDonationService';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../../entities/draftDonation';

const cronJobTime =
  (config.get('MATCH_DRAFT_DONATION_CRONJOB_EXPRESSION') as string) ||
  '0 */5 * * *';

const TWO_MINUTES = 1000 * 60 * 2;

// Queue for filling snapshot balances

// Periodically log the queue count

export const runDraftDonationMatchWorkerJob = () => {
  logger.debug('runDraftDonationMatchWorkerJob', cronJobTime);

  schedule(cronJobTime, () => runDraftDonationMatchWorker());

  setInterval(async () => {
    const count = await DraftDonation.countBy({
      status: DRAFT_DONATION_STATUS.PENDING,
    });
    logger.debug('Pending Draft Donations count:', { count });
  }, TWO_MINUTES);
};
