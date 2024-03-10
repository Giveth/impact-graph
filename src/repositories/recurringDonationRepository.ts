import { Project } from '../entities/project';
import { User } from '../entities/user';
import { RecurringDonation } from '../entities/recurringDonation';
import { AnchorContractAddress } from '../entities/anchorContractAddress';
import { Donation } from '../entities/donation';

export const createNewRecurringDonation = async (params: {
  project: Project;
  donor: User;
  anchorContractAddress: AnchorContractAddress;
  networkId: number;
  txHash: string;
  flowRate: string;
  currency: string;
  anonymous: boolean;
}): Promise<RecurringDonation> => {
  const recurringDonation = await RecurringDonation.create({
    project: params.project,
    donor: params.donor,
    anchorContractAddress: params.anchorContractAddress,
    networkId: params.networkId,
    txHash: params.txHash,
    currency: params.currency,
    flowRate: params.flowRate,
    anonymous: params.anonymous,
  });
  return recurringDonation.save();
};
export const updateRecurringDonation = async (params: {
  recurringDonation: RecurringDonation;
  txHash: string;
  flowRate: string;
  anonymous: boolean;
}): Promise<RecurringDonation> => {
  const { recurringDonation, txHash, anonymous, flowRate } = params;
  recurringDonation.txHash = txHash;
  recurringDonation.flowRate = flowRate;
  recurringDonation.anonymous = anonymous;
  return recurringDonation.save();
};

// TODO Need to write test cases for this function
export const findActiveRecurringDonations = async (): Promise<
  RecurringDonation[]
> => {
  // Return not finished recurring donations
  return RecurringDonation.find({
    where: {
      finished: false,
    },
  });
};

export const findRecurringDonationById = async (
  donationId: number,
): Promise<RecurringDonation | null> => {
  return RecurringDonation.createQueryBuilder('recurringDonation')
    .where(`recurringDonation.id = :donationId`, {
      donationId,
    })
    .leftJoinAndSelect('recurringDonation.project', 'project')
    .getOne();
};

export const findRecurringDonationByProjectIdAndUserIdAndCurrency =
  async (params: {
    projectId: number;
    userId: number;
    currency: string;
  }): Promise<RecurringDonation | null> => {
    return RecurringDonation.createQueryBuilder('recurringDonation')
      .where(`recurringDonation.projectId = :projectId`, {
        projectId: params.projectId,
      })
      .andWhere(`recurringDonation.donorId = :userId`, {
        userId: params.userId,
      })
      .andWhere(`recurringDonation.currency = :currency`, {
        currency: params.currency,
      })
      .leftJoinAndSelect('recurringDonation.project', 'project')
      .getOne();
  };
