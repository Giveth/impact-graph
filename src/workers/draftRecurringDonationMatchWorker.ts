import { expose } from 'threads/worker';
import { WorkerModule } from 'threads/dist/types/worker';
import { DRAFT_DONATION_STATUS } from '../entities/draftDonation';
import { matchDraftRecurringDonations } from '../services/chains/evm/draftRecurringDonationService';
import { logger } from '../utils/logger';
import { AppDataSource } from '../orm';
import {
  DRAFT_RECURRING_DONATION_STATUS,
  DraftRecurringDonation,
} from '../entities/draftRecurringDonation';

type DraftRecurringDonationWorkerFunctions = 'matchDraftRecurringDonations';

export type DrafRecurringtDonationWorker =
  WorkerModule<DraftRecurringDonationWorkerFunctions>;

const TAKE_USER = 100;
const TAKE_DRAFT_RECURRING_DONATION = 1000;

const worker: DrafRecurringtDonationWorker = {
  async matchDraftRecurringDonations() {
    await AppDataSource.initialize(false);
    // const dataSource = await AppDataSource.getDataSource();
    try {
      let userIdSkip = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const userIds = await DraftRecurringDonation.createQueryBuilder(
          'draftRecurringDonation',
        )
          .select('DISTINCT(draftRecurringDonation.donorId)', 'userId')
          .where('draftRecurringDonation.status = :status', {
            status: DRAFT_RECURRING_DONATION_STATUS.PENDING,
          })
          // has not been created in last minute
          .andWhere('draftRecurringDonation.createdAt < :createdAt', {
            createdAt: new Date(Date.now() - 60 * 1000),
          })
          .orderBy('draftDonation.userId')
          .skip(userIdSkip)
          .take(TAKE_USER)
          .getRawMany();
        for (const { userId } of userIds) {
          let draftDonationSkip = 0;

          logger.debug('match draft recurring donation of user: ', userId);
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const draftRecurringDonations = await DraftRecurringDonation.find({
              where: {
                donorId: userId,
                status: DRAFT_DONATION_STATUS.PENDING,
              },
              order: { networkId: 'ASC' },
              take: TAKE_DRAFT_RECURRING_DONATION,
              skip: draftDonationSkip,
            });

            if (draftRecurringDonations.length === 0) break;

            await matchDraftRecurringDonations({
              [draftRecurringDonations[0].donorId]: draftRecurringDonations,
            });
            if (
              draftRecurringDonations.length < TAKE_DRAFT_RECURRING_DONATION
            ) {
              break;
            } else {
              draftDonationSkip += draftRecurringDonations.length;
            }
          }
        }
        if (userIds.length < TAKE_USER) {
          break;
        }
        userIdSkip += userIds.length;
      }
    } catch (e) {
      logger.error('Error in matchDraftRecurringDonations worker', e);
    }
  },
};

expose(worker);
