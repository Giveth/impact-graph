import {
  findActiveQfRound,
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalProjectsDonationsSum,
} from '../repositories/qfRoundRepository';

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

  const allProjectsSum = await getQfRoundTotalProjectsDonationsSum(qfRoundId);

  return (
    ((projectDonationsSqrtRootSum.sqrtRootSum *
      projectDonationsSqrtRootSum.sqrtRootSum) /
      allProjectsSum.sum) *
    activeQfRound.allocatedFund
  );
};
