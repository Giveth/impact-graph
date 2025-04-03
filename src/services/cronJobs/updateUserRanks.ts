import { schedule } from 'node-cron';
import { logger } from '../../utils/logger';
import config from '../../config';
import { User } from '../../entities/user';

const cronJobTime =
  (config.get('UPDATE_USERS_RANKS_CRONJOB_EXPRESSION') as string) ||
  '*/5 * * * *'; // Every 5 minutes by default

export const runUpdateUserRanksCronJob = () => {
  logger.debug('runUpdateUserRanksCronJob() started, cron time:', cronJobTime);

  schedule(cronJobTime, async () => {
    logger.debug('Adding user rank update job to queue');
    updateUserRanks();
  });
};

async function updateUserRanks() {
  try {
    await User.query(`
            WITH ranked_users AS (
              SELECT id, RANK() OVER (ORDER BY "qaccPoints" DESC) as rank
              FROM "user"
            )
            UPDATE "user"
            SET rank = ranked_users.rank
            FROM ranked_users
            WHERE "user".id = ranked_users.id;
          `);
    logger.info('User ranks updated successfully');
  } catch (error) {
    logger.error('Error updating user ranks:', error);
  }
}
