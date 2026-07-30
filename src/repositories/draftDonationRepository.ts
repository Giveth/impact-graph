import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import { DONATION_STATUS } from '../entities/donation';
import { logger } from '../utils/logger';
import { AppDataSource } from '../orm';

// mark donation status matched based on fromWalletAddress, toWalletAddress, networkId, tokenAddress and amount
export async function markDraftDonationStatusMatched(params: {
  matchedDonationId: number;
  fromWalletAddress: string;
  toWalletAddress: string;
  networkId: number;
  currency: string;
  amount: number;
}): Promise<void> {
  try {
    const {
      fromWalletAddress,
      toWalletAddress,
      networkId,
      currency,
      amount,
      matchedDonationId,
    } = params;
    await DraftDonation.update(
      {
        fromWalletAddress,
        toWalletAddress,
        networkId,
        currency,
        amount,
        status: DRAFT_DONATION_STATUS.PENDING,
      },
      {
        status: DRAFT_DONATION_STATUS.MATCHED,
        matchedDonationId,
      },
    );
  } catch (e) {
    logger.error(
      `Error in markDraftDonationStatusMatched - params: ${params} - error: ${e.message}`,
    );
  }
}

export async function delecteExpiredDraftDonations(hours: number) {
  try {
    const expiredTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // donation is expired if it'screated before expiredTime
    const result = await DraftDonation.createQueryBuilder()
      .delete()
      .where('createdAt < :expiredTime', { expiredTime })
      .execute();

    logger.debug(`Expired draft donations removed: ${result.affected}`);
  } catch (e) {
    logger.error(`Error in removing expired draft donations, ${e.message}`);
  }
}

export async function countPendingDraftDonations(): Promise<number> {
  const query = 'SELECT COUNT(*) FROM draft_donation WHERE status = $1';
  const values = ['pending'];

  // Query the database
  const res = await AppDataSource.getDataSource().query(query, values);
  return parseInt(res[0].count, 10);
}

export async function findDraftDonationByMatchedDonationId(
  matchedDonationId: number,
): Promise<DraftDonation | null> {
  return DraftDonation.findOne({
    where: {
      matchedDonationId,
    },
  });
}

// Atomic, guarded status transition for draft donations.
// - `failed` is never applied to a matched draft, nor to a draft whose
//   matchedDonationId references a live (non-failed) donation, so a stale job
//   can never overwrite a successful match. A draft linked to a failed or
//   deleted donation may still be failed (or re-linked while failing).
// - `matched` is applied to any draft that isn't already matched (this allows
//   reconciling a wrongly-failed draft back to matched).
// - `expiresBefore` additionally requires the draft's expiresAt to be older
//   than the given date (a missing expiresAt counts as expired), protecting
//   renewed drafts from stale expiry checks.
// Returns true when the update was applied, false when it was skipped.
export const updateDraftDonationStatus = async (params: {
  donationId: number;
  status: string;
  fromWalletAddress?: string;
  matchedDonationId?: number;
  txHash?: string;
  source?: string;
  expiresBefore?: Date;
  errorMessage?: string;
}): Promise<boolean> => {
  const {
    donationId,
    status,
    fromWalletAddress,
    matchedDonationId,
    txHash,
    source,
    expiresBefore,
    errorMessage,
  } = params;
  try {
    // Loaded only to log the previous status; the update below is conditional
    // on the database state, not on this read.
    const current = await DraftDonation.createQueryBuilder('draftDonation')
      .select([
        'draftDonation.id',
        'draftDonation.status',
        'draftDonation.matchedDonationId',
      ])
      .where('draftDonation.id = :id', { id: donationId })
      .getOne();

    if (!current) {
      logger.info('draftDonationStatusTransition skipped, draft not found', {
        draftDonationId: donationId,
        requestedStatus: status,
        source,
      });
      return false;
    }

    const updateValues: Record<string, unknown> = { status };
    if (fromWalletAddress !== undefined) {
      updateValues.fromWalletAddress = fromWalletAddress;
    }
    if (matchedDonationId !== undefined) {
      updateValues.matchedDonationId = matchedDonationId;
    }
    if (errorMessage !== undefined) {
      updateValues.errorMessage = errorMessage;
    }

    const queryBuilder = DraftDonation.createQueryBuilder()
      .update()
      .set(updateValues)
      .where('id = :id', { id: donationId });

    if (status === DRAFT_DONATION_STATUS.FAILED) {
      queryBuilder
        .andWhere('status != :matchedStatus', {
          matchedStatus: DRAFT_DONATION_STATUS.MATCHED,
        })
        .andWhere(
          `("matchedDonationId" IS NULL OR NOT EXISTS (
            SELECT 1 FROM donation d
            WHERE d.id = draft_donation."matchedDonationId"
              AND d.status != :failedDonationStatus
          ))`,
          { failedDonationStatus: DONATION_STATUS.FAILED },
        );
      if (expiresBefore) {
        queryBuilder.andWhere(
          '("expiresAt" IS NULL OR "expiresAt" < :expiresBefore)',
          { expiresBefore },
        );
      }
    } else if (status === DRAFT_DONATION_STATUS.MATCHED) {
      queryBuilder.andWhere('status != :matchedStatus', {
        matchedStatus: DRAFT_DONATION_STATUS.MATCHED,
      });
    }

    const result = await queryBuilder.execute();
    const skipped = !result.affected;

    logger.info('draftDonationStatusTransition', {
      draftDonationId: donationId,
      previousStatus: current.status,
      requestedStatus: status,
      matchedDonationId: matchedDonationId ?? current.matchedDonationId,
      txHash,
      source,
      skipped,
    });

    return !skipped;
  } catch (e) {
    logger.error(
      `Error in updateDraftDonationStatus - params: ${params} - error: ${e.message}`,
    );
    return false;
  }
};
