import { schedule } from 'node-cron';
import { spawn, Worker, Thread } from 'threads';
import config from '../../config';
import { logger } from '../../utils/logger';
import { findActiveQfRound } from '../../repositories/qfRoundRepository';
import { exportClusterMatchingDonationsFormat } from '../../repositories/donationRepository';
import { EstimatedClusterMatching } from '../../entities/estimatedClusterMatching';

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

const updateEstimatedClusterMatching = async (
  qfRoundId: number,
  matchingData: any,
) => {
  logger.debug('updateEstimatedClusterMatching() has been called');
  try {
    const params: any[] = [];
    const values = matchingData
      .map((data, index) => {
        const baseIndex = index * 3;
        params.push(data.project_name, qfRoundId, data.matching_amount);
        return `(
            (SELECT id FROM project WHERE title = $${baseIndex + 1}),
            $${baseIndex + 2},
            $${baseIndex + 3}
          )`;
      })
      .join(',');

    const query = `
        INSERT INTO "estimated_cluster_matching" ("projectId", "qfRoundId", matching)
        VALUES ${values}
        ON CONFLICT ("projectId", "qfRoundId")
        DO UPDATE SET matching = EXCLUDED.matching
        RETURNING "projectId", "qfRoundId", matching;
      `;

    const result = await EstimatedClusterMatching.query(query, params);
    if (result.length === 0) {
      throw new Error('No records were inserted or updated.');
    }

    logger.debug('Matching data processed successfully with raw SQL.');
  } catch (error) {
    logger.debug('Error processing matching data:', error.message);
  }
};

export const fetchAndUpdateClusterEstimatedMatching = async () => {
  const matchingWorker = await spawn(
    new Worker('../../workers/cocm/estimatedClusterMatchingWorker'),
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
    matching_cap_amount:
      activeQfRound.allocatedFundUSD * activeQfRound.maximumReward,
    matching_amount: activeQfRound.allocatedFundUSD,
    passport_threshold: activeQfRound.minimumPassportScore,
  };

  try {
    // Fetch from python api cluster matching
    const matchingData =
      await matchingWorker.fetchEstimatedClusterMatching(matchingDataInput);

    // Insert the data
    await updateEstimatedClusterMatching(activeQfRound.id, matchingData);

    // Update latest job ran succesfully
    activeQfRound.clusterMatchingSyncAt = new Date();
    await activeQfRound.save();
  } catch (e) {
    logger.error('fetchAndUpdateClusterEstimatedMatching error', e);
  } finally {
    await Thread.terminate(matchingWorker);
  }

  await Thread.terminate(matchingWorker);
};
