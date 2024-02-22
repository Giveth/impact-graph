import { Project } from '../entities/project';
import { User } from '../entities/user';
import { RecurringDonation } from '../entities/recurringDonation';
import { AnchorContractAddress } from '../entities/anchorContractAddress';

export const createNewRecurringDonation = async (params: {
  project: Project;
  donor: User;
  anchorContractAddress: AnchorContractAddress;
  networkId: number;
  txHash: string;
  interval: string;
  amount: number;
  currency: string;
}): Promise<RecurringDonation> => {
  const recurringDonation = await RecurringDonation.create({
    project: params.project,
    donor: params.donor,
    anchorContractAddress: params.anchorContractAddress,
    networkId: params.networkId,
    txHash: params.txHash,
    currency: params.currency,
    interval: params.interval,
    amount: params.amount,
  });
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

export const getRecurringDonationById = async (
  id: number,
): Promise<RecurringDonation | null> => {
  return await RecurringDonation.createQueryBuilder('recurringDonation')
    .innerJoinAndSelect(
      `recurringDonation.anchorContractAddress`,
      'anchorContractAddress',
    )
    .innerJoinAndSelect(`recurringDonation.donations`, 'donations')
    .where(`recurringDonation.id = :id`, { id })
    .andWhere(`recurringDonation.finished = false`)
    .getOne();
};
