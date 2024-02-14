import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import { logger } from '../utils/logger';

// mark donation status matched based on fromWalletAddress, toWalletAddress, networkId, tokenAddress and amount
export async function markDraftDonationStatusMatched(params: {
  fromWalletAddress: string;
  toWalletAddress: string;
  networkId: number;
  currency: string;
  amount: number;
}): Promise<void> {
  try {
    const { fromWalletAddress, toWalletAddress, networkId, currency, amount } =
      params;
    await DraftDonation.update(
      {
        fromWalletAddress,
        toWalletAddress,
        networkId,
        currency,
        amount,
        status: DRAFT_DONATION_STATUS.PENDING,
      },
      { status: DRAFT_DONATION_STATUS.MATCHED },
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
