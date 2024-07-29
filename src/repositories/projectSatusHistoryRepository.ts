import { ProjectStatusHistory } from '../entities/projectStatusHistory.js';

export const findOneProjectStatusHistoryByProjectId = (
  projectId: number,
): Promise<ProjectStatusHistory | null> => {
  return findOneProjectStatusHistory({
    projectId,
  });
};

export const findOneProjectStatusHistory = (params: {
  projectId: number;
  userId?: number;
  statusId?: number;
}): Promise<ProjectStatusHistory | null> => {
  const { projectId, statusId, userId } = params;
  const query = ProjectStatusHistory.createQueryBuilder(
    'project_status_history',
  ).where(`"projectId"=:projectId`, {
    projectId,
  });
  if (userId) {
    query.andWhere(`"userId"=:userId`, {
      userId,
    });
  }
  if (statusId) {
    query.andWhere(`"statusId"=:statusId`, {
      statusId,
    });
  }

  return query.getOne();
};
