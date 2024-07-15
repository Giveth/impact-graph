import { ProjectUpdate } from '../entities/project.js';

export const findProjectUpdatesByProjectId = async (
  projectId: number,
): Promise<ProjectUpdate[] | []> => {
  return ProjectUpdate.createQueryBuilder('projectUpdate')
    .where('projectUpdate.projectId = :projectId', { projectId })
    .andWhere('projectUpdate.isMain = false')
    .getMany();
};
