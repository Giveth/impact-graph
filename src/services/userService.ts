import { User } from '../entities/user';
import { Donation } from '../entities/donation';
import { logger } from '../utils/logger';
import { findAdminUserByEmail } from '../repositories/userRepository';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require('bcrypt');

export const updateUserTotalDonated = async (userId: number) => {
  try {
    await Donation.query(
      `
      UPDATE "user"
      SET "totalDonated" = (
        SELECT COALESCE(SUM(d."valueUsd"),0)
        FROM donation as d
        WHERE d."userId" = $1 AND d."status" = 'verified' AND d."recurringDonationId" IS NULL
      ) + (
        SELECT COALESCE(SUM(rd."totalUsdStreamed"), 0)
        FROM recurring_donation as rd
        WHERE rd."donorId" = $1
      )
      WHERE "id" = $1
      `,
      [userId],
    );
  } catch (e) {
    logger.error('updateUserTotalDonated() error', e);
  }
};

interface DonationStats {
  totalDonated: number;
  donationsCount: string;
  lastDonationDate: Date | null;
}

export const getUserDonationStats = async (
  userId: number,
): Promise<DonationStats | void> => {
  try {
    return await Donation.createQueryBuilder('donation')
      .select('SUM(donation.valueUsd)', 'totalDonated')
      .addSelect('COUNT(donation.id)', 'donationsCount')
      .addSelect('MAX(donation.createdAt)', 'lastDonationDate')
      .where('donation.userId = :userId', { userId })
      .andWhere('donation.status = :status', { status: 'verified' })
      .getRawOne();
  } catch (e) {
    logger.error('getUserDonationStats() error', e);
  }
};

export const updateUserTotalReceived = async (userId: number) => {
  try {
    const totalReceived = await User.createQueryBuilder('user')
      .select('COALESCE(SUM(project.totalDonations), 0)', 'totalReceived')
      .leftJoin('project', 'project', 'project.adminUserId = user.id')
      .where('user.id = :userId', { userId })
      .addGroupBy('user.id')
      .getRawOne();

    await User.createQueryBuilder()
      .update(User)
      .set({ totalReceived: totalReceived.totalReceived })
      .where('id = :userId', { userId })
      .execute();
  } catch (e) {
    logger.error('updateUserTotalReceived() error', e);
  }
};

export const fetchAdminAndValidatePassword = async (params: {
  email: string;
  password: string;
}): Promise<User | undefined> => {
  const { password, email } = params;
  const user = await findAdminUserByEmail(email);
  if (user && (await bcrypt.compare(password, user.encryptedPassword))) {
    return user;
  }
  return;
};
