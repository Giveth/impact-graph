import { getSuperFluidAdapter } from '../adapters/adaptersFactory';
import { RecurringDonation } from '../entities/recurringDonation';

// Initially it will only be monthly data
const priceDisplay = 'month';

export const fetchStreamTableStartDate = (
  recurringDonation: RecurringDonation,
): number => {
  if (recurringDonation.donations && recurringDonation.donations.length > 0) {
    const latestDonation = recurringDonation?.donations?.reduce(
      (prev, current) => {
        return prev.createdAt > current.createdAt ? prev : current;
      },
    );

    return Math.floor(latestDonation?.createdAt?.getTime() / 1000);
  }

  return Math.floor(recurringDonation.createdAt.getTime() / 1000);
};

export const createRelatedDonationsToStream = async (
  recurringDonation: RecurringDonation,
) => {
  const superFluidAdapter = getSuperFluidAdapter();
  const streamData = superFluidAdapter.streamPeriods({
    address: recurringDonation.anchorContractAddress.address,
    chain: recurringDonation.networkId,
    start: fetchStreamTableStartDate(recurringDonation),
    end: Math.floor(new Date().getTime() / 1000),
    priceGranularity: priceDisplay,
    virtualization: priceDisplay,
    currency: recurringDonation.currency,
  });
};

export const validateDonorSuperTokenBalance = async (
  recurringDonation: RecurringDonation,
) => {};
