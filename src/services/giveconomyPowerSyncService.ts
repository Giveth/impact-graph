import axios from 'axios';
import { setMultipleBoosting } from '../repositories/powerBoostingRepository';
import {
  getPowerSyncCursor,
  savePowerSyncCursor,
} from '../repositories/powerSyncCursorRepository';
import { getLatestPowerSyncOutboxEventForUser } from '../repositories/powerSyncOutboxRepository';
import { logger } from '../utils/logger';

type GiveconomyPowerSyncEvent = {
  id: number;
  sourceSystem: string;
  eventType: string;
  entityType: string;
  userId: number;
  sourceUpdatedAt: string;
  payload: {
    userId: number;
    boostings?: Array<{
      projectId: number;
      percentage: number;
      updatedAt: string;
    }>;
  };
};

const GIVECONOMY_SOURCE_SYSTEM = 'giveconomy';

export const pullGiveconomyPowerSync = async (): Promise<{
  fetched: number;
  applied: number;
  skipped: number;
}> => {
  const url = process.env.GIVECONOMY_POWER_SYNC_URL;
  if (!url) {
    logger.debug('Skipping GIVeconomy power sync: url is not configured');
    return { fetched: 0, applied: 0, skipped: 0 };
  }
  if (!process.env.POWER_SYNC_PASSWORD) {
    logger.warn(
      'Skipping GIVeconomy power sync because POWER_SYNC_PASSWORD is missing',
    );
    return { fetched: 0, applied: 0, skipped: 0 };
  }

  const cursor = await getPowerSyncCursor(GIVECONOMY_SOURCE_SYSTEM);
  const response = await axios.get(url, {
    params: {
      afterId: cursor?.lastEventId || 0,
      take: 100,
    },
    headers: process.env.POWER_SYNC_PASSWORD
      ? {
          [process.env.POWER_SYNC_PASSWORD_HEADER || 'x-power-sync-password']:
            process.env.POWER_SYNC_PASSWORD,
        }
      : undefined,
    timeout: Number(process.env.GIVECONOMY_POWER_SYNC_TIMEOUT_MS || 10_000),
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `GIVeconomy power sync request failed with status ${response.status}`,
    );
  }

  const events = (response.data?.data || []) as GiveconomyPowerSyncEvent[];
  let applied = 0;
  let skipped = 0;

  for (const event of events) {
    const wasApplied = await applyGiveconomyPowerSyncEvent(event);
    if (wasApplied) {
      applied += 1;
    } else {
      skipped += 1;
    }

    await savePowerSyncCursor({
      sourceSystem: GIVECONOMY_SOURCE_SYSTEM,
      lastEventId: event.id,
      lastSourceUpdatedAt: new Date(event.sourceUpdatedAt),
    });
  }

  if (events.length > 0) {
    logger.info('Applied GIVeconomy power sync events', {
      fetched: events.length,
      applied,
      skipped,
    });
  }

  return { fetched: events.length, applied, skipped };
};

const applyGiveconomyPowerSyncEvent = async (
  event: GiveconomyPowerSyncEvent,
): Promise<boolean> => {
  if (event.eventType !== 'power-boosting.updated') {
    return false;
  }

  const incomingUpdatedAt = new Date(event.sourceUpdatedAt);
  const latestLocalOutboxEvent = await getLatestPowerSyncOutboxEventForUser({
    sourceSystem: 'impact-graph',
    eventType: 'power-boosting.updated',
    userId: event.userId,
  });
  const latestLocalWrite = latestLocalOutboxEvent?.sourceUpdatedAt;

  if (latestLocalWrite && latestLocalWrite > incomingUpdatedAt) {
    logger.warn('Skipping stale GIVeconomy power sync event', {
      userId: event.userId,
      eventId: event.id,
      sourceUpdatedAt: event.sourceUpdatedAt,
      latestLocalWrite: latestLocalWrite.toISOString(),
    });
    return false;
  }

  const boostings = event.payload.boostings || [];
  await setMultipleBoosting({
    userId: event.userId,
    projectIds: boostings.map(boosting => boosting.projectId),
    percentages: boostings.map(boosting => boosting.percentage),
    allowZeroTotal: true,
    emitOutboxEvent: false,
  });
  return true;
};
