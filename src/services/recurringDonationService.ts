import { getSuperFluidAdapter } from '../adapters/adaptersFactory';
import { Donation } from '../entities/donation';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../entities/recurringDonation';
import { addressToSuperTokens } from '../provider';
import { findProjectById } from '../repositories/projectRepository';
import { findUserById } from '../repositories/userRepository';

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
  const streamData = await superFluidAdapter.streamPeriods({
    address: recurringDonation.anchorContractAddress.address,
    chain: recurringDonation.networkId,
    start: fetchStreamTableStartDate(recurringDonation),
    end: Math.floor(new Date().getTime() / 1000),
    priceGranularity: priceDisplay,
    virtualization: priceDisplay,
    currency: recurringDonation.currency,
  });

  if (streamData.stoppedAtTimestamp) {
    recurringDonation.finished = true;
    recurringDonation.save();
  }

  const project = await findProjectById(recurringDonation.projectId);
  const user = await findUserById(recurringDonation.donorId);
  const uniquePeriods: any[] = [];

  for (const period of streamData.virtualPeriods) {
    const existingPeriod = await Donation.findOne({
      where: {
        virtualPeriodStart: period.startTime,
        virtualPeriodEnd: period.endTime,
      },
    });

    if (!existingPeriod) {
      uniquePeriods.push({
        startTime: period.startTime,
        endTime: period.endTime,
        amount: period.amount,
        amountFiat: period.amountFiat,
      });
    }
  }

  // Create ONLY non existant virtual period donations
  if (uniquePeriods.length === 0) return;
};

export const validateDonorSuperTokenBalance = async (
  recurringDonation: RecurringDonation,
) => {
  const superFluidAdapter = getSuperFluidAdapter();
  const user = await findUserById(recurringDonation.donorId);

  const accountBalances = await superFluidAdapter.accountBalance(
    user!.walletAddress!,
  );
  for (const tokenBalance of accountBalances.accountTokenSnapshots) {
    if (
      Object.keys(addressToSuperTokens).includes(tokenBalance.token.id) &&
      tokenBalance.maybeCriticalAtTimestamp
    ) {
      // Notify user their super token is running out
    }
  }
};
