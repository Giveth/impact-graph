import { Reaction } from '../entities/reaction';

export const findUsersWhoLikedProject = async (
  projectId: number,
): Promise<{ walletAddress: string; email?: string }[]> => {
  const reactions = await Reaction.createQueryBuilder('reaction')
    .leftJoin('reaction.user', 'user')
    .addSelect(['user.walletAddress'])
    .where(`"projectId"=:projectId`, {
      projectId,
    })
    .getMany();

  return reactions.map(reaction => {
    return {
      walletAddress: reaction.user.walletAddress?.toLowerCase() as string,
      email: reaction.user.email,
    };
  });
};
