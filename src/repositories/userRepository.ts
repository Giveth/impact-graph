import { publicSelectionFields, User, UserRole } from '../entities/user';
import { SegmentAnalyticsSingleton } from '../services/segment/segmentAnalyticsSingleton';
import { Project } from '../entities/project';

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

export const findAllUsers = async (params: {
  take: number;
  skip: number;
}): Promise<{ users: User[]; count: number }> => {
  const [users, count] = await User.createQueryBuilder('user')
    .take(params.take)
    .skip(params.skip)
    .getManyAndCount();
  return { users, count };
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
