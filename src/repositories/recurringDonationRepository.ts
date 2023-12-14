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
}): Promise<RecurringDonation> => {
  const recurringDonation = await RecurringDonation.create({
    project: params.project,
    donor: params.donor,
    anchorContractAddress: params.anchorContractAddress,
    networkId: params.networkId,
    txHash: params.txHash,
  });
  return recurringDonation.save();
};
