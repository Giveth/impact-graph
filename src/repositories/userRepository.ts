import { publicSelectionFields, User, UserRole } from '../entities/user';
import { SegmentAnalyticsSingleton } from '../services/segment/segmentAnalyticsSingleton';

export const findAdminUserByEmail = async (
  email: string,
): Promise<User | null> => {
  return User.createQueryBuilder()
    .where(`email = :email`, { email })
    .andWhere(`role != '${UserRole.RESTRICTED}'`)
    .getOne();
};

export const findUserByWalletAddress = async (
  walletAddress: string,
  includeSensitiveFields = true,
): Promise<User | null> => {
  const query = User.createQueryBuilder('user').where(
    `LOWER("walletAddress") = :walletAddress`,
    {
      walletAddress: walletAddress.toLowerCase(),
    },
  );
  if (!includeSensitiveFields) {
    query.select(publicSelectionFields);
  }

  return query.getOne();
};

export const findUserById = (userId: number): Promise<User | null> => {
  return User.createQueryBuilder('user')
    .where(`id=:userId`, {
      userId,
    })
    .getOne();
};

export const createUserWithPublicAddress = async (
  walletAddress: string,
): Promise<User> => {
  const user = await User.create({
    walletAddress: walletAddress.toLowerCase(),
    loginType: 'wallet',
    segmentIdentified: true,
  }).save();

  SegmentAnalyticsSingleton.getInstance().identifyUser(user);

  return user;
};
