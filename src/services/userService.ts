import { Project } from '../entities/project';
import { User } from '../entities/user';
import { Donation } from '../entities/donation';
import { logger } from '../utils/logger';

export const updateUserTotalDonated = async (userId: number) => {
  try {
    const userDonated = await Donation.query(
      `select COALESCE(SUM("valueUsd"),0) as total from donation where "userId" = ${userId}`,
    );
    await User.update(
      { id: userId },
      {
        totalDonated: userDonated[0].total,
      },
    );
  } catch (e) {
    logger.error('updateUserTotalDonated() error', e);
  }
};

export const updateUserTotalReceived = async (userId: number) => {
  try {
    const userReceived = await Project.query(
      `select COALESCE(SUM("totalDonations"),0) as total from project where "admin" = '${userId}'`,
    );
    await User.update(
      { id: userId },
      {
        totalReceived: userReceived[0].total,
      },
    );
  } catch (e) {
    logger.error('updateUserTotalReceived() error', e);
  }
};
