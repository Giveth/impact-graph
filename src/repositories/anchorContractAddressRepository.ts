import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { Project } from '../entities/project';
import { User } from '../entities/user';

export const addNewAnchorAddress = async (params: {
  project: Project;
  owner: User;
  creator: User;
  address: string;
  networkId: number;
  txHash: string;
}): Promise<AnchorContractAddress> => {
  const anchorContractAddress = await AnchorContractAddress.create({
    ...params,
    isActive: true,
  });
  return anchorContractAddress.save();
};

export const findActiveAnchorAddress = async (params: {
  projectId: number;
  networkId: number;
}) => {
  const { projectId, networkId } = params;
  return AnchorContractAddress.findOne({
    where: {
      isActive: true,
      networkId,
      projectId,
    },
  });
};
