import { ProjectAddress } from '../entities/projectAddress';
import { Project } from '../entities/project';
import { User } from '../entities/user';
import { BaseEntity } from 'typeorm';
import { logger } from '../utils/logger';

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
          where address = $1
          limit 1
    `,
    [address],
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
export const findAllRelatedAddressByWalletAddress = async (
  walletAddress: string,
) => {
  return ProjectAddress.createQueryBuilder('projectAddress')
    .where(`LOWER(address) = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .leftJoinAndSelect('projectAddress.project', 'project')
    .getMany();
};

export const findProjectRecipientAddressByNetworkId = async (params: {
  projectId: number;
  networkId: number;
}): Promise<ProjectAddress | null> => {
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
  const projectAddress = await ProjectAddress.create(params as ProjectAddress);
  return projectAddress.save();
};

export const addBulkNewProjectAddress = async (
  params: {
    project: Project;
    user: User;
    address: string;
    title?: string;
    isRecipient?: boolean;
    networkId: number;
  }[],
): Promise<void> => {
  const queryBuilder = ProjectAddress.createQueryBuilder()
    .insert()
    .into(ProjectAddress);

  try {
    const values = params.map(item => ({
      projectId: item.project.id,
      userId: item.user.id,
      address: item.address,
      title: item.title,
      isRecipient: item.isRecipient,
      networkId: item.networkId,
    }));

    await queryBuilder.values(values).execute();
  } catch (error) {
    logger.error('Error occurred during bulk insert: ', error);
    throw error;
  }
};

export const removeRecipientAddressOfProject = async (params: {
  project: Project;
}): Promise<void> => {
  return ProjectAddress.query(`
    DELETE from project_address
    WHERE "projectId"=${params.project.id} AND "isRecipient"=true
    RETURNING *
  `);
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
