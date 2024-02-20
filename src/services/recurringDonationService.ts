import { RecurringDonation } from '../entities/recurringDonation';
import { findRecurringDonationById } from '../repositories/recurringDonationRepository';

export const updateRecurringDonationStatusWithNetwork = async (params: {
  donationId: number;
}): Promise<RecurringDonation> => {
  // TODO Should implement it
  return (await findRecurringDonationById(
    params.donationId,
  )) as RecurringDonation;
};
