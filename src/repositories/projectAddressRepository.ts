import { ProjectAddress } from '../entities/projectAddress';
import { Project } from '../entities/project';
import { User } from '../entities/user';
import { ChainType } from '../types/network';
import { logger } from '../utils/logger';
import SentryLogger from '../sentryLogger';

export const getPurpleListAddresses = async (): Promise<
  { projectAddress: string }[]
> => {
  // ProjStatus.active value is 5 and we need to just need to consider active projects for purple list
  const addresses = await ProjectAddress.query(
    `
          SELECT "projectId", LOWER(address) as "projectAddress"
          FROM project_address
          JOIN project
          on project.id="projectId" and "verified"=true and "statusId" = 5 
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
          on project.id="projectId" and "verified"=true and "statusId" = 5
          where address = $1
          limit 1
    `,
    [address.toLowerCase()],
  );
  return projectAddress.length > 0;
};

export const findRelatedAddressByWalletAddress = async (
  walletAddress: string,
  chainType?: ChainType,
  memo?: string,
): Promise<ProjectAddress | null> => {
  let query = ProjectAddress.createQueryBuilder('projectAddress');

  switch (chainType) {
    case ChainType.SOLANA:
      query = query.where(`address = :walletAddress`, {
        walletAddress,
      });
      break;
    case ChainType.STELLAR:
      // If a memo is provided, check for both address and memo
      if (memo) {
        query = query.where(
          'UPPER(address) = :walletAddress AND memo = :memo',
          {
            walletAddress: walletAddress.toUpperCase(),
            memo,
          },
        );
      } else {
        // If no memo is provided, check only the address
        query = query.where(
          'UPPER(address) = :walletAddress AND memo IS NULL',
          {
            walletAddress: walletAddress.toUpperCase(),
          },
        );
      }
      break;
    case ChainType.EVM:
    default:
      query = query.where(`LOWER(address) = :walletAddress`, {
        walletAddress: walletAddress.toLowerCase(),
      });
      break;
  }
  return query.leftJoinAndSelect('projectAddress.project', 'project').getOne();
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
  chainType?: ChainType;
  memo?: string;
}): Promise<ProjectAddress> => {
  const projectAddress = ProjectAddress.create(params as ProjectAddress);
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
    chainType?: ChainType;
    memo?: string;
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
      chainType: item.chainType,
      memo: item.memo,
    }));

    await queryBuilder.values(values).execute();
  } catch (error) {
    // won't propagate the error in the meantime
    SentryLogger.captureMessage(
      `Error during bulk insert project ${params[0].project.id}: ${error}`,
    );
    logger.error(
      `Error during bulk insert project ${params[0].project.id}: `,
      error,
    );
  }
};

export const removeRecipientAddressOfProject = async (params: {
  project: Project;
}): Promise<void> => {
  // await ProjectAddress.delete({
  //   project: params.project,
  //   isRecipient: true,
  // });

  return ProjectAddress.query(`
    DELETE from project_address
    WHERE "projectId"=${params.project.id} AND "isRecipient"=true
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
