import { Reaction } from '../entities/reaction';

export const findUserReactionsByProjectIds = async (
  authenticatedUserId: number,
  projectIds: number[],
): Promise<Reaction[]> => {
  if (!authenticatedUserId) return [];

  return Reaction.createQueryBuilder('reaction')
    .where('reaction.userId = :userId', { userId: authenticatedUserId })
    .andWhere('reaction.projectId IN (:...ids)', { ids: projectIds })
    .getMany();
};
