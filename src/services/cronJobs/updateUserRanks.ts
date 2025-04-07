import { schedule } from 'node-cron';
import { logger } from '../../utils/logger';
import config from '../../config';
import { AppDataSource } from '../../orm';

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
    await AppDataSource.getDataSource().query(
      `
         REFRESH MATERIALIZED VIEW user_ranks_materialized_view
        `,
    );
    logger.info('User ranks materialized_view refreshed successfully');
  } catch (error) {
    logger.error('Error updating user ranks:', error);
  }
}
