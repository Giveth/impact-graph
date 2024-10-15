import { schedule } from 'node-cron';
import { spawn, Worker, Thread } from 'threads';
import config from '../../config';
import { logger } from '../../utils/logger';
import {
  findActiveQfRound,
  findUsersWithoutMBDScoreInActiveAround,
} from '../../repositories/qfRoundRepository';
import { findUserById } from '../../repositories/userRepository';
import { UserQfRoundModelScore } from '../../entities/userQfRoundModelScore';

const cronJobTime =
  (config.get('SYNC_ESTIMATED_CLUSTED_MATCHING_CRONJOB_EXPRESSION') as string) ||
  '0 * * * * *';

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
  const fetchWorker = await spawn(
    new Worker('../../workers/cocm/fetchEstimatedClusterMtchingWorker'),
  );

  const updateWorker = await spawn(
    new Worker('../../workers/cocm/updateProjectsEstimatedClusterMatchingWorker')
  );
  const activeQfRoundId =
    (await findActiveQfRound())?.id;
  if (!activeQfRoundId || activeQfRoundId === 0) return;

  for (const projectId of []) {
    try {

    //   const userScore = await worker.syncUserScore({
    //     userWallet: user?.walletAddress,
    //   });
    } catch (e) {
      logger.info(`User with Id ${1} did not sync MBD score this batch`);
    }
  }
  await Thread.terminate(fetchWorker);
  await Thread.terminate(updateWorker);
};
