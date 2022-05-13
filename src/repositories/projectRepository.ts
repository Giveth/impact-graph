import { Project } from '../entities/project';

export const findProjectById = (
  projectId: number,
): Promise<Project | undefined> => {
  return Project.findOne({ id: projectId });
};

export const findProjectByIdJoin = async (projectId: number) => {
  const project = await Project.createQueryBuilder('project')
    .leftJoinAndSelect('project.organization', 'organization')
    .leftJoinAndSelect('project.status', 'status')
    .where(`project.id =${projectId}`)
    .getOne();
  return project;
};

export const findProjectByWalletAddress = async (
  walletAddress: string,
): Promise<Project | undefined> => {
  return Project.createQueryBuilder('project')
    .where(`LOWER("walletAddress") = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .leftJoinAndSelect('project.status', 'status')
    .getOne();
};
