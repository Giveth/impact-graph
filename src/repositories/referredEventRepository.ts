import { ReferredEvent } from '../entities/referredEvent.js';

export const firstOrCreateReferredEventByUserId = async (
  userId: number,
): Promise<ReferredEvent> => {
  const referredEvent = await findReferredEventByUserId(userId);
  if (referredEvent) return referredEvent;

  return await createReferredEventByUserId(userId);
};

export const findReferredEventByUserId = async (
  userId: number,
): Promise<ReferredEvent | null> => {
  return await ReferredEvent.createQueryBuilder('event')
    .where('event.userId = :userId', { userId })
    .getOne();
};

export const createReferredEventByUserId = async (
  userId: number,
): Promise<ReferredEvent> => {
  return await ReferredEvent.create({
    userId,
  }).save();
};
