import { Project } from '../entities/project';

export const findProjectByWalletAddress = async (walletAddress: string) => {
  return Project.createQueryBuilder('project')
    .where(`LOWER("walletAddress") = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .getOne();
};
