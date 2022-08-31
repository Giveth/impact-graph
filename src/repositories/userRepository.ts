import { getAnalytics } from '../analytics/analytics';
import { publicSelectionFields, User, UserRole } from '../entities/user';

const analytics = getAnalytics();

export const findAdminUserByEmail = async (
  email: string,
): Promise<User | undefined> => {
  return User.createQueryBuilder()
    .where(`email = :email`, { email })
    .andWhere(`role != '${UserRole.RESTRICTED}'`)
    .getOne();
};

export const findUserByWalletAddress = async (
  walletAddress: string,
  includeSensitiveFields = true,
): Promise<User | undefined> => {
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

export const findUserById = (userId: number): Promise<User | undefined> => {
  return User.findOne({ id: userId });
};

export const createUserWithPublicAddress = async (
  walletAddress: string,
): Promise<User> => {
  const user = await User.create({
    walletAddress: walletAddress.toLowerCase(),
    loginType: 'wallet',
    segmentIdentified: true,
  }).save();

  analytics.identifyUser(user);

  return user;
};
