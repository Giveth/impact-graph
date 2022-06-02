import { RelatedAddress } from '../entities/relatedAddress';
import { Project } from '../entities/project';
import { User } from '../entities/user';

export const getPurpleListAddresses = async (): Promise<
  { relatedAddress: string }[]
> => {
  // addresses that are related to verified projects
  const addresses = await RelatedAddress.query(
    `
          SELECT "projectId", LOWER(address) as "relatedAddress"
          FROM related_address
          JOIN project
          on project.id="projectId" and "verified"=true
      `,
  );
  return addresses;
};

export const isWalletAddressInPurpleList = async (
  address: string,
): Promise<boolean> => {
  const relatedAddress = await RelatedAddress.query(
    `
          SELECT "projectId", LOWER(address) as "relatedAddress"
          FROM related_address
          JOIN project
          on project.id="projectId" and "verified"=true
          where address='${address}'
          limit 1
      `,
  );
  return relatedAddress.length > 0;
};

export const findRelatedAddressByWalletAddress = async (
  walletAddress: string,
) => {
  return RelatedAddress.createQueryBuilder('relatedAddress')
    .where(`LOWER(address) = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
    .leftJoinAndSelect('relatedAddress.project', 'project')
    .getOne();
};
export const findProjectRecipientAddressByNetworkId = async (params: {
  projectId: number;
  networkId: number;
}): Promise<RelatedAddress | undefined> => {
  const { projectId, networkId } = params;
  return RelatedAddress.createQueryBuilder('relatedAddress')
    .where(`"projectId" = :projectId`, {
      projectId,
    })
    .andWhere(`"networkId" = :networkId`, {
      networkId,
    })
    .andWhere(`"isRecipient" = true`)
    .getOne();
};

export const addNewRelatedAddress = async (params: {
  project: Project;
  user: User;
  address: string;
  title?: string;
  isRecipient?: boolean;
  networkId: number;
}): Promise<RelatedAddress> => {
  return RelatedAddress.create(params).save();
};

export const removeRelatedAddressOfProject = async (params: {
  project: Project;
}): Promise<void> => {
  await RelatedAddress.delete({
    project: params.project,
  });
};
