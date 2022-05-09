import { Project } from '../entities/project';

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
