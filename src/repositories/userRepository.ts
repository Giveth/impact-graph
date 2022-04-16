import { User, UserRole } from '../entities/user';

export const findAdminUserByEmail = async (
  email: string,
): Promise<User | undefined> => {
  const users = await User.query(`
            SELECT * FROM public."user"
            WHERE email='${email}'
            AND role != '${UserRole.RESTRICTED}'
            LIMIT 1
          `);
  return users.length > 0 ? users[0] : null;
};

export const findUserByWalletAddress = async (
  walletAddress: string,
): Promise<User | undefined> => {
  const user = await User.query(
    `
        SELECT * FROM public."user"
        WHERE LOWER("walletAddress") = LOWER('${walletAddress}')
  `,
  );
  return user.length > 0 ? user[0] : undefined;
};

export const findUserById = (userId: number): Promise<User | undefined> => {
  return User.findOne({ id: userId });
};
