import {
  findInCompletePowerSnapShots,
  updatePowerSnapShots,
} from '../repositories/powerSnapshotRepository';
import { getRoundNumberByDate } from './cronJobs/syncUserPowers';
import { getBlockByTime } from './blockByDateService';
import { getTimestampInSeconds } from '../utils/utils';

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
      powerSnapShotId: powerSnapshot.id,
      roundNumber,
      blockNumber,
    });
  }
};
