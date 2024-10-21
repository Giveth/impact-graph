import { schedule } from 'node-cron';
import { spawn, Worker, Thread } from 'threads';
import config from '../../config';
import { logger } from '../../utils/logger';
import { findActiveQfRound } from '../../repositories/qfRoundRepository';
import { exportClusterMatchingDonationsFormat } from '../../repositories/donationRepository';

const cronJobTime =
  (config.get(
    'SYNC_ESTIMATED_CLUSTER_MATCHING_CRONJOB_EXPRESSION',
  ) as string) || '0 * * * * *';

const defaultMatchingStrategy = 'COCM';

export const runSyncEstimatedClusterMatchingCronjob = () => {
  logger.debug(
    'runSyncEstimatedClusterMatchingCronjob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    await fetchAndUpdateClusterEstimatedMatching();
  });
};

export const fetchAndUpdateClusterEstimatedMatching = async () => {
  const matchingWorker = await spawn(
    new Worker('../../workers/cocm/estimatedClusterMtchingWorker'),
  );

  const activeQfRound = await findActiveQfRound();
  if (!activeQfRound?.id) return;

  const clusterMatchingDonations = await exportClusterMatchingDonationsFormat(
    activeQfRound?.id,
  );
  if (!clusterMatchingDonations || clusterMatchingDonations?.length === 0)
    return;

  const matchingDataInput = {
    votes_data: clusterMatchingDonations,
    strategy: defaultMatchingStrategy,
    min_donation_threshold_amount: activeQfRound.minimumValidUsdValue,
    matching_cap_amount: activeQfRound.maximumReward,
    matching_amount: activeQfRound.allocatedFundUSD,
    passport_threshold: activeQfRound.minimumPassportScore,
  };

  try {
    // Fetch from python api cluster matching
    const matchingData =
      await matchingWorker.fetchEstimatedClusterMatching(matchingDataInput);

    // Insert the data
    await matchingWorker.updateEstimatedClusterMatching(
      activeQfRound.id,
      matchingData,
    );
  } catch (e) {
    logger.error('fetchAndUpdateClusterEstimatedMatching error', e);
  }

  await Thread.terminate(matchingWorker);
};
