import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { isTestEnv } from '../../utils/utils';
import {
  deactivateExpiredQfRounds,
  getExpiredActiveQfRounds,
} from '../../repositories/qfRoundRepository';
import {
  refreshProjectActualMatchingView,
  refreshProjectEstimatedMatchingView,
} from '../projectViewsService';
import { fillQfRoundHistory } from '../../repositories/qfRoundHistoryRepository';
import { fillQfRoundDonationsUserScores } from '../../repositories/donationRepository';

// every 10 minutes
const cronJobTime =
  (config.get('CHECK_QF_ROUND_ACTIVE_STATUS_CRONJOB_EXPRESSION') as string) ||
  '*/10 * * * *';

export const runCheckActiveStatusOfQfRounds = () => {
  if (isTestEnv) {
    // we dont want it get executed in test env because it may cause some problems
    return;
  }
  logger.debug(
    'runCheckActiveStatusOfQfRounds() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    const expiredActiveQfRounds = await getExpiredActiveQfRounds();
    if (expiredActiveQfRounds.length > 0) {
      logger.debug(
        'runCheckActiveStatusOfQfRounds() these round should get deactivated and then refresh project views',
        expiredActiveQfRounds,
      );
      await deactivateExpiredQfRounds();
      await refreshProjectEstimatedMatchingView();
      await fillQfRoundDonationsUserScores();
      await refreshProjectActualMatchingView();
      await fillQfRoundHistory();
    }
  });
};
