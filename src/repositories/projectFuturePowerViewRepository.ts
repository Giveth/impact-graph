import { ProjectFuturePowerView } from '../views/projectFuturePowerView.js';

export const findFuturePowers = async (
  projectIds: number[] = [],
  round?: number,
  take: number = 100,
  skip: number = 0,
): Promise<[ProjectFuturePowerView[], number]> => {
  const query = ProjectFuturePowerView.createQueryBuilder(
    'projectFuturePowerView',
  ).leftJoinAndSelect('projectFuturePowerView.project', 'project');

  if (projectIds.length > 0 && round) {
    query
      .where('projectFuturePowerView.projectId IN (:...projectIds)', {
        projectIds,
      })
      .andWhere('projectFuturePowerView.round = :round', { round });
  } else if (projectIds.length === 0 && round) {
    query.where('projectFuturePowerView.round = :round', { round });
  } else if (projectIds.length > 0 && !round) {
    query.where('projectFuturePowerView.projectId IN (:...projectIds)', {
      projectIds,
    });
  }

  return query.take(take).skip(skip).getManyAndCount();
};
