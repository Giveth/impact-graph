import config from '../../config';
import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import { getCurrentDateFormatted } from '../../utils/utils';
import Bull from 'bull';
import { redisConfig } from '../../redis';
import { addNewUserPassportScoreWithGitcoinData } from '../userPassportScoreService';
import { fetchUsersAndRoundsNeedingPassportScore } from '../../repositories/userPassportScoreRepository';

const cronJobTime =
  process.env.INSERT_USER_PASSPORT_SCORE_FOR_QF_ROUND_CRONJOB_TIME ||
  '0 0 * * *'; // one day at 00:00

export const runInsertUserPassportScoresJob = () => {
  logger.debug(
    'runUpdateRecurringDonationStream() has been called, cronJobTime',
    cronJobTime,
  );
  processInsertPassportScoreJobs();
  schedule(cronJobTime, async () => {
    logger.debug('runUpdateRecurringDonationStream() has been started');
    try {
      await insertUserPassportScoresForClosedQfRounds();
    } catch (error) {
      logger.error('runUpdateRecurringDonationStream() error', error);
    }
    logger.debug('runUpdateRecurringDonationStream() has been finished');
  });
};

const insertUserPassportScoresForClosedQfRoundsQueue = new Bull(
  'insert-user-passport-score-for-closed-qf-round',
  {
    redis: redisConfig,
  },
);
const TWO_MINUTES = 1000 * 60 * 2;
setInterval(async () => {
  const insertUserPassportScoresForClosedQfRoundsQueueCount =
    await insertUserPassportScoresForClosedQfRoundsQueue.count();
  logger.debug(`Update recurring donations stream job queues count:`, {
    insertUserPassportScoresForClosedQfRoundsQueueCount,
  });
}, TWO_MINUTES);

export const insertUserPassportScoresForClosedQfRounds = async () => {
  logger.debug('insertUserPassportScoresForClosedQfRounds() has been called');
  const items = await fetchUsersAndRoundsNeedingPassportScore(
    Number(process.env.QfRound_PASSPORT_SCORE_CHECK_START_TIMESTAMP_IN_SECONDS),
  );
  logger.debug(
    'insertUserPassportScoresForClosedQfRounds() items need to be processed count',
    items.length,
  );

  items.forEach(({ qfRoundId, userId }) => {
    logger.debug('Trying to insert passport score for ', {
      qfRoundId,
      userId,
    });
    insertUserPassportScoresForClosedQfRoundsQueue.add(
      {
        qfRoundId,
        userId,
      },
      {
        // Because we want to run this job once per day so we need to add the date to the job id
        jobId: `insert-user-passport-score-for-closed-qf-round-${getCurrentDateFormatted()}-
          ${qfRoundId}-${userId}
        `,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  });
};

export function processInsertPassportScoreJobs() {
  logger.debug('processInsertPassportScoreJobs() has been called');
  insertUserPassportScoresForClosedQfRoundsQueue.process(
    1,
    async (job, done) => {
      const { qfRoundId, userId } = job.data;
      logger.debug('job processing', { jobData: job.data });
      try {
        await addNewUserPassportScoreWithGitcoinData({ qfRoundId, userId });
        done();
      } catch (e) {
        logger.error(
          'processInsertPassportScoreJobs >> processInsertPassportScoreJobs error',
          job.data,
          e,
        );
        done();
      }
    },
  );
}
