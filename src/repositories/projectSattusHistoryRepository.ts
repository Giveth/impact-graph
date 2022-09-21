import { ProjectStatusHistory } from '../entities/projectStatusHistory';
import { SocialProfile } from '../entities/socialProfile';

export const findOneProjectStatusHistoryByProjectId = (
  projectId: number,
): Promise<ProjectStatusHistory | null> => {
  return ProjectStatusHistory.createQueryBuilder('project_status_history')
    .where(`"projectId"=:projectId`, {
      projectId,
    })
    .getOne();
};
