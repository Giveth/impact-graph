import { QfRound } from '../entities/qfRound';

export interface QfRoundSmartSelectResult {
  qfRoundId: number;
  qfRoundName: string;
  matchingPoolAmount: number;
  eligibleNetworks: number[];
  allocatedFundUSD: number;
}

export class QfRoundSmartSelectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QfRoundSmartSelectError';
  }
}

/**
 * Smart select logic for QF rounds based on network eligibility and prioritization
 * @param networkId - The network ID to check eligibility for
 * @param projectId - The project ID to find QF rounds for
 * @returns The selected QF round information
 * @throws QfRoundSmartSelectError when no eligible QF rounds are found
 */
export async function selectQfRoundForProject(
  networkId: number,
  projectId: number,
): Promise<QfRoundSmartSelectResult> {
  // Get active QF rounds that include the specified project
  const activeQfRounds = await QfRound.createQueryBuilder('qfRound')
    .leftJoin('qfRound.projects', 'project')
    .where('qfRound.isActive = :isActive', { isActive: true })
    .andWhere('project.id = :projectId', { projectId })
    .getMany();

  if (activeQfRounds.length === 0) {
    throw new QfRoundSmartSelectError(
      'No eligible QF rounds found for this project',
    );
  }

  // Filter QF rounds that have the specified network in their eligibleNetworks
  // and that haven't ended yet
  const currentTime = new Date();
  const eligibleQfRounds = activeQfRounds.filter(
    qfRound =>
      qfRound.isEligibleNetwork(networkId) && qfRound.endDate > currentTime,
  );

  if (eligibleQfRounds.length === 0) {
    throw new QfRoundSmartSelectError(
      'No eligible QF rounds found for the specified network',
    );
  }

  if (eligibleQfRounds.length === 1) {
    const qfRound = eligibleQfRounds[0];
    return {
      qfRoundId: qfRound.id,
      qfRoundName: qfRound.name || qfRound.title || 'Unnamed QF Round',
      matchingPoolAmount: qfRound.allocatedFund,
      eligibleNetworks: qfRound.eligibleNetworks,
      allocatedFundUSD: qfRound.allocatedFundUSD,
    };
  }

  // Multiple eligible QF rounds - apply prioritization logic
  const now = new Date();

  // Sort by allocatedFundUSD (descending), then by endDate (ascending), then by priority (ascending)
  const sortedQfRounds = eligibleQfRounds.sort((a, b) => {
    // First, compare by allocatedFundUSD (higher is better)
    const fundComparison =
      (b.allocatedFundUSD || 0) - (a.allocatedFundUSD || 0);
    if (fundComparison !== 0) {
      return fundComparison;
    }

    // If allocatedFundUSD is the same, compare by endDate (closer to now is better, but not less than now)
    const aEndDate = new Date(a.endDate);
    const bEndDate = new Date(b.endDate);

    // Filter out rounds that have already ended
    const aIsValid = aEndDate >= now;
    const bIsValid = bEndDate >= now;

    if (aIsValid && !bIsValid) return -1;
    if (!aIsValid && bIsValid) return 1;
    if (!aIsValid && !bIsValid) return 0;

    // Both are valid, compare by endDate (closer to now is better)
    const dateComparison = aEndDate.getTime() - bEndDate.getTime();
    if (dateComparison !== 0) {
      return dateComparison;
    }

    // If endDate is the same, compare by priority (lower number is higher priority)
    return (a.priority || 0) - (b.priority || 0);
  });

  const selectedQfRound = sortedQfRounds[0];
  return {
    qfRoundId: selectedQfRound.id,
    qfRoundName:
      selectedQfRound.name || selectedQfRound.title || 'Unnamed QF Round',
    matchingPoolAmount: selectedQfRound.allocatedFund,
    eligibleNetworks: selectedQfRound.eligibleNetworks,
    allocatedFundUSD: selectedQfRound.allocatedFundUSD,
  };
}
