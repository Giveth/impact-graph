import { expose } from 'threads/worker';
import { WorkerModule } from 'threads/dist/types/worker';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import { matchDraftDonations } from '../services/chains/evm/draftDonationService';
import { logger } from '../utils/logger';
import { AppDataSource } from '../orm';

type DraftDonationWorkerFunctions = 'matchDraftDonations';

export type DraftDonationWorker = WorkerModule<DraftDonationWorkerFunctions>;

const TAKE_USER = 100;
const TAKE_DRAFT_DONATION = 1000;

const worker: DraftDonationWorker = {
  async matchDraftDonations() {
    logger.debug('matchDraftDonations() has been called');
    // const dataSource = await AppDataSource.getDataSource();
    try {
      await AppDataSource.initialize(false);

      let userIdSkip = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const userIds = await DraftDonation.createQueryBuilder('draftDonation')
          .select('DISTINCT(draftDonation.userId)', 'userId')
          .where('draftDonation.status = :status', {
            status: DRAFT_DONATION_STATUS.PENDING,
          })
          // has not been created in last minute
          .andWhere('draftDonation.createdAt < :createdAt', {
            createdAt: new Date(Date.now() - 60 * 1000),
          })
          .orderBy('draftDonation.userId')
          .skip(userIdSkip)
          .take(TAKE_USER)
          .getRawMany();
        logger.debug(
          'matchDraftDonations() userId that have pending draft donation',
          userIds,
        );
        for (const { userId } of userIds) {
          let draftDonationSkip = 0;

          logger.debug('match draft donation of user: ', userId);
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const draftDonations = await DraftDonation.find({
              where: {
                userId,
                status: DRAFT_DONATION_STATUS.PENDING,
              },
              order: { networkId: 'ASC' },
              take: TAKE_DRAFT_DONATION,
              skip: draftDonationSkip,
            });

            if (draftDonations.length === 0) break;

            await matchDraftDonations({
              [draftDonations[0].fromWalletAddress]: draftDonations,
            });
            if (draftDonations.length < TAKE_DRAFT_DONATION) {
              break;
            } else {
              draftDonationSkip += draftDonations.length;
            }
          }
        }
        if (userIds.length < TAKE_USER) {
          break;
        }
        userIdSkip += userIds.length;
      }
    } catch (e) {
      logger.error('Error in matchDraftDonations worker', e);
    }
  },
};

expose(worker);
