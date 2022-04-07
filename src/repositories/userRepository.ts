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
