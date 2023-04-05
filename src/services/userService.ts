import { Project } from '../entities/project';
import { User } from '../entities/user';
import { Donation } from '../entities/donation';
import { logger } from '../utils/logger';
import { findAdminUserByEmail } from '../repositories/userRepository';
// tslint:disable-next-line:no-var-requires
const bcrypt = require('bcrypt');

export const updateUserTotalDonated = async (userId: number) => {
  try {
    await Donation.query(
      `
      UPDATE "user"
      SET "totalDonated" = (
        SELECT COALESCE(SUM(d."valueUsd"),0)
        FROM donation as d
        WHERE d."userId" = $1 AND d."status" = 'verified'
      )
      WHERE "id" = $1
    `,
      [userId],
    );
  } catch (e) {
    logger.error('updateUserTotalDonated() error', e);
  }
};

export const updateUserTotalReceived = async (userId: number) => {
  try {
    await User.query(
      `
      UPDATE "user"
      SET "totalReceived" = (
        SELECT COALESCE(SUM(p."totalDonations"),0)
        FROM project as p
        WHERE p."adminUserId" = $1
      )
      WHERE "id" = $1
    `,
      [userId],
    );
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
  if (user) return user;
  return undefined;
};
