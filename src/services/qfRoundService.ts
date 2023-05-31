import {
  findActiveQfRound,
  getProjectDonationsSqrtRootSumToThePowerOfTwo,
  getQfRoundTotalProjectsDonationsSum,
} from '../repositories/qfRoundRepository';

export const calculateEstimateMatchingForProjectById = async (
  projectId: number,
): Promise<number | null> => {
  const activeQfRound = await findActiveQfRound();
  if (!activeQfRound) {
    return null;
  }

  const projectMatch = await getProjectDonationsSqrtRootSumToThePowerOfTwo(
    projectId,
    activeQfRound.id,
  );

  const totalSummedProjectsDonations =
    await getQfRoundTotalProjectsDonationsSum(activeQfRound.id);

  const divisor =
    activeQfRound.allocatedFund / totalSummedProjectsDonations.sum;

  const estimatedMatch = projectMatch.sqrtRootSum * divisor;

  return estimatedMatch;
};
