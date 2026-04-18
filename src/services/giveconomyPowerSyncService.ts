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
const STALE_GIVECONOMY_POWER_SYNC_EVENT = 'STALE_GIVECONOMY_POWER_SYNC_EVENT';
const DEFAULT_GIVPOWER_PERCENTAGE_PRECISION = 2;

const getSyncedPercentagePrecision = (): number => {
  const precision = Number(process.env.GIVPOWER_BOOSTING_PERCENTAGE_PRECISION);
  return Number.isInteger(precision) && precision >= 0
    ? precision
    : DEFAULT_GIVPOWER_PERCENTAGE_PRECISION;
};

const roundSyncedPercentage = (percentage: number): number => {
  return Number(percentage.toFixed(getSyncedPercentagePrecision()));
};

const normalizeRoundedBoostings = (
  boostings: Array<{
    projectId: number;
    percentage: number;
    updatedAt: string;
  }>,
): Array<{
  projectId: number;
  percentage: number;
  updatedAt: string;
}> => {
  if (boostings.length === 0) {
    return boostings;
  }

  const precision = getSyncedPercentagePrecision();
  const roundingStep = 1 / 10 ** precision;
  const total = boostings.reduce(
    (sum, boosting) => sum + boosting.percentage,
    0,
  );
  const delta = Number((100 - total).toFixed(precision));
  const maxRoundingDrift = roundingStep * boostings.length;

  if (
    total <= 0 ||
    delta === 0 ||
    Math.abs(delta) > maxRoundingDrift + Number.EPSILON
  ) {
    return boostings;
  }

  const indexToAdjust = boostings.reduce(
    (bestIndex, boosting, index, items) =>
      boosting.percentage > items[bestIndex].percentage ? index : bestIndex,
    0,
  );
  const adjustedPercentage = Number(
    (boostings[indexToAdjust].percentage + delta).toFixed(precision),
  );

  if (adjustedPercentage < 0 || adjustedPercentage > 100) {
    return boostings;
  }

  return boostings.map((boosting, index) =>
    index === indexToAdjust
      ? {
          ...boosting,
          percentage: adjustedPercentage,
        }
      : boosting,
  );
};

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
  const syncedBoostings = normalizeRoundedBoostings(
    (event.payload.boostings || [])
      .map(boosting => ({
        ...boosting,
        percentage: roundSyncedPercentage(boosting.percentage),
      }))
      .filter(boosting => boosting.percentage > 0),
  ).filter(boosting => boosting.percentage > 0);
  let applied = true;

  try {
    await setMultipleBoosting({
      userId: event.userId,
      projectIds: syncedBoostings.map(boosting => boosting.projectId),
      percentages: syncedBoostings.map(boosting => boosting.percentage),
      allowZeroTotal: true,
      allowPartialTotal: true,
      allowExceedProjectLimit: true,
      emitOutboxEvent: false,
      beforeSave: async () => {
        const latestLocalOutboxEvent =
          await getLatestPowerSyncOutboxEventForUser({
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
          applied = false;
          throw new Error(STALE_GIVECONOMY_POWER_SYNC_EVENT);
        }
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === STALE_GIVECONOMY_POWER_SYNC_EVENT
    ) {
      return false;
    }

    throw error;
  }
  return applied;
};
