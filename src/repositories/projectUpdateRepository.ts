import { ProjectUpdate } from '../entities/project';

export const findProjectUpdatesByProjectId = async (
  projectId: number,
): Promise<ProjectUpdate[] | []> => {
  return ProjectUpdate.createQueryBuilder('projectUpdate')
    .where('projectUpdate.projectId = :projectId', { projectId })
    .andWhere('projectUpdate.isMain = false')
    .getMany();
};
