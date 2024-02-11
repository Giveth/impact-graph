import { expose } from 'threads/worker';
import { WorkerModule } from 'threads/dist/types/worker';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import { matchDraftDonations } from '../services/chains/evm/draftDonationService';
import { logger } from '../utils/logger';
// import { expose } from 'threads';

type DraftDonationWorkerFunctions = 'matchDraftDonations';

export type DraftDonationWorker = WorkerModule<DraftDonationWorkerFunctions>;

let isIdle = true;
const TAKE_USER = 100;
const TAKE_DRAFT_DONATION = 1000;

const worker: DraftDonationWorker = {
  async matchDraftDonations() {
    if (!isIdle) {
      logger.warn('Draft donation matching worker is already running');
      return;
    }
    try {
      let userIdSkip = 0;
      while (true) {
        const userIds = await DraftDonation.createQueryBuilder('draftDonation')
          .select('DISTINCT(draftDonation.userId)', 'userId')
          .where('draftDonation.status = :status', {
            status: DRAFT_DONATION_STATUS.PENDING,
          })
          .orderBy('draftDonation.userId')
          .skip(userIdSkip)
          .take(TAKE_USER)
          .getRawMany();
        for (const { userId } of userIds) {
          let draftDonationSkip = 0;
          const draftDonations = await DraftDonation.find({
            where: {
              userId,
              status: DRAFT_DONATION_STATUS.PENDING,
            },
            order: { networkId: 'ASC' },
            take: TAKE_DRAFT_DONATION,
            skip: draftDonationSkip,
          });
          await matchDraftDonations({ [userId]: draftDonations });
          if (draftDonations.length < TAKE_DRAFT_DONATION) {
            break;
          } else {
            draftDonationSkip += draftDonations.length;
          }
        }
        if (userIds.length < TAKE_USER) {
          break;
        }
        userIdSkip += userIds.length;
      }
    } catch (e) {
      logger.error('Error in matchDraftDonations worker', e);
    } finally {
      isIdle = true;
    }
  },
};

expose(worker);
