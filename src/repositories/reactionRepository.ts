import { Reaction } from '../entities/reaction.js';

export const findUserReactionsByProjectIds = async (
  authenticatedUserId: number,
  projectIds: number[],
): Promise<Reaction[]> => {
  if (!authenticatedUserId || projectIds.length === 0) return [];

  return Reaction.createQueryBuilder('reaction')
    .where('reaction.userId = :userId', { userId: authenticatedUserId })
    .andWhere('reaction.projectId IN (:...ids)', { ids: projectIds })
    .getMany();
};
