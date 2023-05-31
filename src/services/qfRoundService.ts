import {
  findActiveQfRound,
  getProjectDonationsSqrtRootSumToThePowerOfTwo,
  getQfRoundTotalProjectsDonationsSum,
} from '../repositories/qfRoundRepository';

// // Setup a divisor based on available match
// let divisor = match / summed;
// // Multiply matched values with divisor to get match amount in range of available funds
// for (let i = 0; i < newData.length; i++) {
//   newData[i].match *= divisor;
// }
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
