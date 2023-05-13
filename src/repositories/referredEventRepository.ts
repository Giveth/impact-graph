import { ReferredEvent } from '../entities/referredEvent';

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
  return await ReferredEvent.createQueryBuilder('referredEvent')
    .where(`referredEvent.userId = :userId`, { userId })
    .getOne();
};

export const createReferredEventByUserId = async (
  userId: number,
): Promise<ReferredEvent> => {
  return ReferredEvent.create({
    userId,
  }).save();
};
