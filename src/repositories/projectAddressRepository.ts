import { ProjectAddress } from '../entities/projectAddress';
import { Project } from '../entities/project';
import { User } from '../entities/user';

export const getPurpleListAddresses = async (): Promise<
  { projectAddress: string }[]
> => {
  // addresses that are related to verified projects
  const addresses = await ProjectAddress.query(
    `
          SELECT "projectId", LOWER(address) as "projectAddress"
          FROM project_address
          JOIN project
          on project.id="projectId" and "verified"=true
      `,
  );
  return addresses;
};

export const isWalletAddressInPurpleList = async (
  address: string,
): Promise<boolean> => {
  const projectAddress = await ProjectAddress.query(
    `
          SELECT "projectId", LOWER(address) as "projectAddress"
          FROM project_address
          JOIN project
          on project.id="projectId" and "verified"=true
          where address='${address}'
          limit 1
      `,
  );
  return projectAddress.length > 0;
};

export const findRelatedAddressByWalletAddress = async (
  walletAddress: string,
) => {
  return ProjectAddress.createQueryBuilder('projectAddress')
    .where(`LOWER(address) = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .leftJoinAndSelect('projectAddress.project', 'project')
    .getOne();
};
export const findProjectRecipientAddressByNetworkId = async (params: {
  projectId: number;
  networkId: number;
}): Promise<ProjectAddress | undefined> => {
  const { projectId, networkId } = params;
  return ProjectAddress.createQueryBuilder('projectAddress')
    .where(`"projectId" = :projectId`, {
      projectId,
    })
    .andWhere(`"networkId" = :networkId`, {
      networkId,
    })
    .andWhere(`"isRecipient" = true`)
    .getOne();
};

export const addNewProjectAddress = async (params: {
  project: Project;
  user: User;
  address: string;
  title?: string;
  isRecipient?: boolean;
  networkId: number;
}): Promise<ProjectAddress> => {
  return ProjectAddress.create(params).save();
};

export const removeRelatedAddressOfProject = async (params: {
  project: Project;
}): Promise<void> => {
  await ProjectAddress.delete({
    project: params.project,
  });
};

export const findProjectRecipientAddressByProjectId = async (params: {
  projectId: number;
}): Promise<ProjectAddress[]> => {
  const { projectId } = params;
  return ProjectAddress.createQueryBuilder('projectAddress')
    .where(`"projectId" = :projectId`, {
      projectId,
    })
    .andWhere(`"isRecipient" = true`)
    .getMany();
};
