import {
  findInCompletePowerSnapShots,
  updatePowerSnapShots,
} from '../repositories/powerSnapshotRepository';
import { getRoundNumberByDate } from '../utils/powerBoostingUtils';
import { logger } from '../utils/logger';

export const fillIncompletePowerSnapshots = async (): Promise<void> => {
  const incompletePowerSnapshots = await findInCompletePowerSnapShots();
  logger.debug(
    'fillIncompletePowerSnapshots incompletePowerSnapshots',
    JSON.stringify(incompletePowerSnapshots, null, 2),
  );
  for (const powerSnapshot of incompletePowerSnapshots) {
    try {
      const roundNumber = getRoundNumberByDate(powerSnapshot.time).round;
      await updatePowerSnapShots({
        powerSnapshot,
        roundNumber,
      });
    } catch (e) {
      logger.error('fillIncompletePowerSnapshots error', e);
    }
  }
};
