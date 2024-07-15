import { schedule } from 'node-cron';
import config from '../../config.js';
import { logger } from '../../utils/logger.js';
import {
  getPowerRound,
  setPowerRound,
} from '../../repositories/powerRoundRepository.js';
import { getRoundNumberByDate } from '../../utils/powerBoostingUtils.js';
import {
  refreshProjectPowerView,
  refreshProjectFuturePowerView,
  getBottomRank,
} from '../../repositories/projectPowerViewRepository.js';
import { refreshUserProjectPowerView } from '../../repositories/userProjectPowerViewRepository.js';
import {
  copyProjectRanksToPreviousRoundRankTable,
  projectsThatTheirRanksHaveChanged,
} from '../../repositories/previousRoundRankRepository.js';
import { getNotificationAdapter } from '../../adapters/adaptersFactory.js';
import { sleep } from '../../utils/utils.js';
import { fillIncompletePowerSnapshots } from '../powerSnapshotServices.js';

const cronJobTime =
  (config.get('UPDATE_POWER_ROUND_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * *';

export const runUpdatePowerRoundCronJob = () => {
  logger.debug(
    'runUpdatePowerRoundCronJob() has been called, cronJobTime',
    cronJobTime,
  );
  schedule(cronJobTime, async () => {
    const fillSnapshotsRoundNumberPromise = fillIncompletePowerSnapshots();

    const currentRound = await getPowerRound();
    const powerRound = getRoundNumberByDate(new Date()).round - 1;
    logger.debug('runUpdatePowerRoundCronJob', {
      powerRound,
      currentRound,
      'powerRound !== currentRound?.round': powerRound !== currentRound?.round,
    });
    let oldBottomRank;
    if (powerRound !== currentRound?.round) {
      logger.debug(
        'runUpdatePowerRoundCronJob copy rounds to previousRoundRank',
      );
      await copyProjectRanksToPreviousRoundRankTable();
      await setPowerRound(powerRound);
      oldBottomRank = await getBottomRank();
    }

    await fillSnapshotsRoundNumberPromise;

    await Promise.all([
      refreshProjectPowerView(),
      refreshProjectFuturePowerView(),
      refreshUserProjectPowerView(),
    ]);
    if (powerRound !== currentRound?.round) {
      // Refreshing views need time to refresh tables, so I wait for 1 minute and after that check project rank changes
      await sleep(120_000);
      const projectThatTheirRankChanged =
        await projectsThatTheirRanksHaveChanged();
      const newBottomRank = await getBottomRank();
      logger.debug('runUpdatePowerRoundCronJob projectThatTheirRankChanged', {
        oldBottomRank,
        newBottomRank,
        projectThatTheirRankChanged: projectThatTheirRankChanged.filter(
          item =>
            item.oldRank !== oldBottomRank || item.newRank !== newBottomRank,
        ),
      });
      await getNotificationAdapter().projectsHaveNewRank({
        oldBottomRank,
        newBottomRank,
        projectRanks: projectThatTheirRankChanged,
      });
    }
  });
};
