import { EntityManager } from 'typeorm';
import { PowerSyncOutboxEvent } from '../entities/powerSyncOutboxEvent';

export const insertPowerSyncOutboxEvent = async (
  manager: EntityManager,
  params: {
    eventType: string;
    entityType: string;
    userId: number;
    sourceUpdatedAt: Date;
    payload: Record<string, unknown>;
  },
): Promise<PowerSyncOutboxEvent> => {
  return manager.save(
    PowerSyncOutboxEvent.create({
      sourceSystem: 'impact-graph',
      eventType: params.eventType,
      entityType: params.entityType,
      userId: params.userId,
      sourceUpdatedAt: params.sourceUpdatedAt,
      payload: params.payload,
    }),
  );
};

export const getPowerSyncOutboxEventsAfterId = async (
  afterId: number,
  take: number,
): Promise<PowerSyncOutboxEvent[]> => {
  return PowerSyncOutboxEvent.createQueryBuilder('powerSyncOutboxEvent')
    .where('powerSyncOutboxEvent.id > :afterId', { afterId })
    .orderBy('powerSyncOutboxEvent.id', 'ASC')
    .take(take)
    .getMany();
};
