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
  powerSnapShotId: number;
}): Promise<void> => {
  const { blockNumber, roundNumber, powerSnapShotId } = params;
  await PowerSnapshot.createQueryBuilder()
    .update<PowerSnapshot>(PowerSnapshot, {
      blockNumber,
      roundNumber,
    })
    .where(`id = ${powerSnapShotId}`)
    .returning('*')
    .updateEntity(true)
    .execute();
};
