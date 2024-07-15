import { expose } from 'threads/worker';
import { DRAFT_DONATION_STATUS } from '../entities/draftDonation.js';
import { matchDraftRecurringDonations } from '../services/chains/evm/draftRecurringDonationService.js';
import { logger } from '../utils/logger.js';
import { AppDataSource } from '../orm.js';
import { DraftRecurringDonation } from '../entities/draftRecurringDonation.js';

const TAKE_DRAFT_RECURRING_DONATION = 1000;

const worker = {
  async matchDraftRecurringDonations() {
    await AppDataSource.initialize(false);
    // const dataSource = await AppDataSource.getDataSource();
    try {
      let draftDonationSkip = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const draftRecurringDonations = await DraftRecurringDonation.find({
          where: {
            status: DRAFT_DONATION_STATUS.PENDING,
          },
          order: { networkId: 'ASC' },
          take: TAKE_DRAFT_RECURRING_DONATION,
          skip: draftDonationSkip,
        });

        if (draftRecurringDonations.length === 0) break;

        await matchDraftRecurringDonations(draftRecurringDonations);
        if (draftRecurringDonations.length < TAKE_DRAFT_RECURRING_DONATION) {
          break;
        } else {
          draftDonationSkip += draftRecurringDonations.length;
        }
      }
    } catch (e) {
      logger.error('Error in matchDraftRecurringDonations worker', e);
    }
  },
};

expose(worker);
