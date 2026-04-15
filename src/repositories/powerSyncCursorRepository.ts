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
  await PowerSyncCursor.upsert(
    {
      sourceSystem: params.sourceSystem,
      lastEventId: params.lastEventId,
      lastSourceUpdatedAt: params.lastSourceUpdatedAt || null,
    },
    ['sourceSystem'],
  );

  return (await getPowerSyncCursor(params.sourceSystem)) as PowerSyncCursor;
};
