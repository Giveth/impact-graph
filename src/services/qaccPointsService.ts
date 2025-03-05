import { Donation } from '../entities/donation';
import { QaccPointsHistory } from '../entities/qaccPointsHistory';
import { logger } from '../utils/logger';
import { updateUserQaccPoints } from './userService';

export const addQaccPointsForDonation = async (donation: Donation) => {
  try {
    if (!donation || !donation.user) {
      logger.error(`No verified donation found for ID: ${donation.id}`);
      return;
    }

    const { user, amount } = donation;
    if (amount <= 0) {
      logger.warn(
        `Donation amount is zero or negative, skipping. Donation ID: ${donation.id}`,
      );
      return;
    }

    const pointsEarned = user.qaccPointsMultiplier * amount;

    // Store q/acc points (1 POL = 1 q/acc point)
    const qaccPointsEntry = QaccPointsHistory.create({
      user,
      donation,
      pointsEarned,
    });
    await qaccPointsEntry.save();

    // Update user qacc points
    await updateUserQaccPoints(user.id, amount);
  } catch (error) {
    logger.error('Error in addQaccPointsForDonation()', error);
  }
};
