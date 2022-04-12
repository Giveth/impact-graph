import { Project } from '../entities/project';

export const findProjectById = async (projectId: number) => {
  const project = await Project.findOne({
    id: projectId,
  });
  return project;
};

export const findProjectByIdJoin = async (projectId: number) => {
  const project = await Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.organization', 'organization')
    .leftJoinAndSelect('project.status', 'status')
    .where(`project.id =${projectId}`)
    .getOne();
  return project;
};
