import { logger } from '../utils/logger';
import {
  DRAFT_RECURRING_DONATION_STATUS,
  DraftRecurringDonation,
} from '../entities/draftRecurringDonation';

// mark donation status matched based on fromWalletAddress, toWalletAddress, networkId, tokenAddress and amount
export async function markDraftRecurringDonationStatusMatched(params: {
  matchedRecurringDonationId: number;
  flowRate: string;
  projectId: number;
  networkId: number;
  currency: string;
}): Promise<void> {
  try {
    const {
      networkId,
      currency,
      matchedRecurringDonationId,
      projectId,
      flowRate,
    } = params;
    await DraftRecurringDonation.update(
      {
        projectId,
        flowRate,
        networkId,
        currency,
        status: DRAFT_RECURRING_DONATION_STATUS.PENDING,
      },
      {
        status: DRAFT_RECURRING_DONATION_STATUS.MATCHED,
        matchedRecurringDonationId,
      },
    );
  } catch (e) {
    logger.error(
      `Error in markDraftRecurringDonationStatusMatched - params: ${params} - error: ${e.message}`,
    );
  }
}

export async function deleteExpiredDraftRecurringDonations(hours: number) {
  try {
    const expiredTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // donation is expired if it'screated before expiredTime
    const result = await DraftRecurringDonation.createQueryBuilder()
      .delete()
      .where('createdAt < :expiredTime', { expiredTime })
      .execute();

    logger.debug(`Expired draft donations removed: ${result.affected}`);
  } catch (e) {
    logger.error(`Error in removing expired draft donations, ${e.message}`);
  }
}
