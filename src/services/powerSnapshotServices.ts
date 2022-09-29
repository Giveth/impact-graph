import {
  findInCompletePowerSnapShots,
  updatePowerSnapShots,
} from '../repositories/powerSnapshotRepository';
import { getBlockByTime } from './blockByDateService';
import { getTimestampInSeconds } from '../utils/utils';
import { getRoundNumberByDate } from '../utils/powerBoostingUtils';
import { logger } from '../utils/logger';

export const fillIncompletePowerSnapshots = async (): Promise<void> => {
  const incompletePowerSnapshots = await findInCompletePowerSnapShots();
  logger.debug(
    'fillIncompletePowerSnapshots incompletePowerSnapshots',
    JSON.stringify(incompletePowerSnapshots, null, 2),
  );
  for (const powerSnapshot of incompletePowerSnapshots) {
    const roundNumber = getRoundNumberByDate(powerSnapshot.time).round;
    const blockNumber = await getBlockByTime(
      getTimestampInSeconds(powerSnapshot.time),
    );
    await updatePowerSnapShots({
      powerSnapshot,
      roundNumber,
      blockNumber,
    });
  }
};
