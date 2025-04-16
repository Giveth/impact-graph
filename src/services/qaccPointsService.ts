import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import { QaccPointsHistory } from '../entities/qaccPointsHistory';
import {
  findUsersUniqueProjectsCount,
  updateUserPointsMultiplier,
  updateUserProjectsFundedCount,
} from '../repositories/userRepository';
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

    const userProjectCount = await findUsersUniqueProjectsCount(user.id);
    if (user.projectsFundedCount !== userProjectCount) {
      await updateUserProjectsFundedCount(user.id, userProjectCount);
    }

    let multiplier = user.qaccPointsMultiplier;

    const totalProjectsCount =
      await Project.createQueryBuilder('project').getCount();

    if (userProjectCount >= 5) {
      multiplier = 2;
    }
    if (userProjectCount >= 10) {
      multiplier = 3;
    }
    if (userProjectCount >= totalProjectsCount) {
      multiplier = 5;
    }

    if (multiplier > user.qaccPointsMultiplier) {
      await updateUserPointsMultiplier(user.id, multiplier);
    }

    const pointsEarned = multiplier * amount;

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
