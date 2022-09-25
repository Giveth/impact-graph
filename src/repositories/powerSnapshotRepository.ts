import { PowerSnapshot } from '../entities/powerSnapshot';
import { Project } from '../entities/project';

export const findInCompletePowerSnapShots = async (): Promise<
  PowerSnapshot[]
> => {
  return PowerSnapshot.createQueryBuilder()
    .where('"blockNumber" IS NULL')
    .getMany();
};

export const findPowerSnapshotById = async (
  id: number,
): Promise<PowerSnapshot | undefined> => {
  return PowerSnapshot.createQueryBuilder()
    .where('id=:id', {
      id,
    })
    .getOne();
};

export const updatePowerSnapShots = async (params: {
  blockNumber: number;
  roundNumber: number;
  powerSnapshot: PowerSnapshot;
}): Promise<void> => {
  const { blockNumber, roundNumber, powerSnapshot } = params;
  powerSnapshot.blockNumber = blockNumber;
  powerSnapshot.roundNumber = roundNumber;
  await powerSnapshot.save();
};
