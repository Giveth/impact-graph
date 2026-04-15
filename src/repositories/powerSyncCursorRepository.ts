import { PowerSyncCursor } from '../entities/powerSyncCursor';

export const getPowerSyncCursor = async (
  sourceSystem: string,
): Promise<PowerSyncCursor | null> => {
  return PowerSyncCursor.findOne({
    where: { sourceSystem },
  });
};

export const savePowerSyncCursor = async (params: {
  sourceSystem: string;
  lastEventId: number;
  lastSourceUpdatedAt?: Date | null;
}): Promise<PowerSyncCursor> => {
  let cursor = await getPowerSyncCursor(params.sourceSystem);
  if (!cursor) {
    cursor = PowerSyncCursor.create({
      sourceSystem: params.sourceSystem,
    });
  }

  cursor.lastEventId = params.lastEventId;
  cursor.lastSourceUpdatedAt = params.lastSourceUpdatedAt || null;

  return cursor.save();
};
