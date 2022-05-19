import { getAnalytics } from '../analytics/analytics';
import { User, UserRole } from '../entities/user';

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
): Promise<User | undefined> => {
  return User.createQueryBuilder()
    .where(`LOWER("walletAddress") = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .getOne();
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
