import { User, UserRole } from '../entities/user';

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
