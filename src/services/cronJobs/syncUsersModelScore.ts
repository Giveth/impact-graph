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
  (config.get('SYNC_USER_MODEL_SCORE_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * * *';

const qfRoundUsersMissedMBDScore = Number(
  process.env.QF_ROUND_USERS_MISSED_SCORE || 0,
);

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
  const worker = await spawn(
    new Worker('../../workers/userMBDScoreSyncWorker'),
  );
  const userIds = await findUsersWithoutMBDScoreInActiveAround();
  const activeQfRoundId =
    (await findActiveQfRound())?.id || qfRoundUsersMissedMBDScore;
  if (!activeQfRoundId || activeQfRoundId === 0) return;

  if (userIds.length === 0) return;

  for (const userId of userIds) {
    try {
      const user = await findUserById(userId);
      if (!user) continue;

      const userScore = await worker.syncUserScore({
        userWallet: user?.walletAddress,
      });
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
  await Thread.terminate(worker);
};
