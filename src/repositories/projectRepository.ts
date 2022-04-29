import { Project } from '../entities/project';

export const findProjectByWalletAddress = async (walletAddress: string) => {
  return await Project.findOne({
    where: {
      walletAddress,
    },
  });
};
