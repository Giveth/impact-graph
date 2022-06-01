import { RelatedAddress } from '../entities/relatedAddress';
import { Project } from '../entities/project';
import { User } from '../entities/user';

export const getUniqueRelatedAddresses = async () => {
  return RelatedAddress.query(
    `
          SELECT LOWER(address) as "relatedAddress"
          FROM related_address
      `,
  );
};

export const findRelatedAddressByWalletAddress = async (
  walletAddress: string,
) => {
  return RelatedAddress.createQueryBuilder()
    .where(`LOWER(address) = :walletAddress`, {
      walletAddress: walletAddress.toLowerCase(),
    })
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
