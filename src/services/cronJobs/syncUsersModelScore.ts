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
  '0 * * * * *';

const qfRoundUsersMissedMBDScore = Number(
  process.env.QF_ROUND_USERS_MISSED_SCORE || 0,
);

export const runCheckPendingUserModelScoreCronjob = () => {
  logger.debug(
    'runCheckPendingUserModelScoreCronjob() has been called, cronJobTime is ',
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
    logger.debug(`User with ${userId} is being processed`);
    try {
      const user = await findUserById(userId);
      logger.debug(`User with ${user?.id} fetched from Db`);
      if (!user) continue;
      logger.debug(
        `User ${user.id} with wallet ${user.walletAddress} fetching score`,
      );
      const userScore = await worker.syncUserScore({
        userWallet: user?.walletAddress?.toLowerCase(),
      });
      logger.debug(`User with ${user?.id} has score of ${userScore}`);
      await UserQfRoundModelScore.query(`
        INSERT INTO "user_qf_round_model_score" ("userId", "qfRoundId", "score", "createdAt", "updatedAt")
        VALUES ('${userId}', '${activeQfRoundId}', ${userScore}, NOW(), NOW());
      `);
      logger.debug(`${user.id} score saved!`);
    } catch (e) {
      logger.info(`User with Id ${userId} did not sync MBD score this batch`);
    }
  }
  await Thread.terminate(worker);
};
