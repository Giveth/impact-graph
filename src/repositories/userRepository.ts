import { User, UserRole } from '../entities/user';

export const findAdminUserByEmail = async (email): Promise<User | null> => {
  const users = await User.query(`
            SELECT * FROM public."user"
            WHERE email='${email}'
            AND role != '${UserRole.RESTRICTED}'
            LIMIT 1
          `);
  return users.length > 0 ? users[0] : null;
};

export const findUserByWalletAddress = async (walletAddress: string) => {
  // select UPPER("firstName") from public."user"
  // where LOWER("firstName") = LOWER('mohAMmad')
  // return User.findOne({ walletAddress });
  const user = await User.query(`SELECT * FROM public."user"
  WHERE LOWER("walletAddress") = LOWER('${walletAddress}')
  `);
  return user.length > 0 ? user[0] : undefined;
};

export const findUserById = (userId: number) => {
  return User.findOne({ id: userId });
};
