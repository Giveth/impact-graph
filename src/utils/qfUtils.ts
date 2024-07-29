import {
  findActiveQfRound,
  getQfRoundTotalSqrtRootSumSquared,
  getProjectDonationsSqrtRootSum,
} from '../repositories/qfRoundRepository.js';

export const calculateEstimatedMatchingWithParams = async (params: {
  matchingPool: number;
  projectDonationsSqrtRootSum: number;
  allProjectsSum: number;
}): Promise<number> => {
  const { projectDonationsSqrtRootSum, allProjectsSum, matchingPool } = params;

  return (
    ((projectDonationsSqrtRootSum * projectDonationsSqrtRootSum) /
      allProjectsSum) *
    matchingPool
  );
};

export const calculateEstimateMatchingForProjectById = async (params: {
  projectId: number;
  qfRoundId: number;
}): Promise<number | null> => {
  const { projectId, qfRoundId } = params;
  const activeQfRound = await findActiveQfRound();
  if (!activeQfRound) {
    return null;
  }

  const projectDonationsSqrtRootSum = await getProjectDonationsSqrtRootSum(
    projectId,
    qfRoundId,
  );

  const allProjectsSum = await getQfRoundTotalSqrtRootSumSquared(
    activeQfRound.id,
  );

  return calculateEstimatedMatchingWithParams({
    matchingPool: activeQfRound.allocatedFund,
    projectDonationsSqrtRootSum,
    allProjectsSum,
  });
};
