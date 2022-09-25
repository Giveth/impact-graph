import {
  findInCompletePowerSnapShots,
  updatePowerSnapShots,
} from '../repositories/powerSnapshotRepository';
import { getBlockByTime } from './blockByDateService';
import { getTimestampInSeconds } from '../utils/utils';
import { getRoundNumberByDate } from '../utils/powerBoostingUtils';

export const fillIncompletePowerSnapshots = async (): Promise<void> => {
  const incompletePowerSnapshots = await findInCompletePowerSnapShots();
  for (const powerSnapshot of incompletePowerSnapshots) {
    const roundNumber = getRoundNumberByDate(
      powerSnapshot.time,
    ).previousGivbackRound;
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
