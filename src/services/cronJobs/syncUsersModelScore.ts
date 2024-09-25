import { schedule } from 'node-cron';
import { ModuleThread, Pool, spawn, Worker } from 'threads';
import config from '../../config';
import { logger } from '../../utils/logger';
import {
  findActiveQfRound,
  findUsersWithoutMBDScoreInActiveAround,
} from '../../repositories/qfRoundRepository';
import { UserMDBScoreSyncWorker } from '../../workers/usersMBDScoreSyncWorker';
import { findUserById } from '../../repositories/userRepository';
import { UserQfRoundModelScore } from '../../entities/userQfRoundModelScore';

const cronJobTime =
  (config.get('MAKE_UNREVIEWED_PROJECT_LISTED_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * *';

const qfRoundUsersMissedMBDScore = Number(
  process.env.QF_ROUND_USERS_MISSED_SCORE || 0,
);

const workerOptions = {
  concurrency: Number(
    process.env.USER_SCORE_SYNC_THREADS_POOL_CONCURRENCY || 1,
  ),
  name:
    process.env.USER_SCORE_SYNC_THREADS_POOL_NAME || 'ProjectFiltersThreadPool',
  size: Number(process.env.USER_SCORE_SYNC_THREADS_POOL_SIZE || 4),
};

export const runCheckPendingUserModelScoreCronjob = () => {
  logger.debug(
    'runCheckPendingUserModelScoreCronjob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    await updateUsersWithoutMBDScoreInRound();
  });
};

export const updateUsersWithoutMBDScoreInRound = async () => {
  const usersMDBScoreSyncThreadPool: Pool<
    ModuleThread<UserMDBScoreSyncWorker>
  > = Pool(
    () => spawn(new Worker('../workers/usersMBDScoreSyncWoker')),
    workerOptions,
  );

  const userIds = await findUsersWithoutMBDScoreInActiveAround();
  const activeQfRoundId =
    (await findActiveQfRound())?.id || qfRoundUsersMissedMBDScore;
  if (!activeQfRoundId || activeQfRoundId === 0) return;

  if (userIds.length === 0) return;

  for (const userId of userIds) {
    try {
      const userWallet = await findUserById(userId);
      const userScore = await usersMDBScoreSyncThreadPool.queue(worker =>
        worker.syncUserScore({
          userWallet,
        }),
      );
      if (userScore) {
        const userScoreInRound = UserQfRoundModelScore.create({
          userId,
          qfRoundId: activeQfRoundId,
          score: userScore,
        });

        await userScoreInRound.save();
      }
    } catch (e) {
      logger.info(`User with Id ${userId} did not sync MBD score this batch`);
    }
  }
  await usersMDBScoreSyncThreadPool.terminate();
};
