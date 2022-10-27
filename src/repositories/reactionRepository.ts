import { Reaction } from '../entities/reaction';
import { User } from '../entities/user';

export const findUsersWhoLikedProject = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  return Reaction.createQueryBuilder('reaction')
    .leftJoin(User, 'user', 'reaction.userId = user.id')
    .select('LOWER(user.walletAddress) AS "walletAddress", user.email as email')
    .where(`"projectId"=:projectId`, {
      projectId,
    })
    .getRawMany();
};
