import BroadcastNotification from '../entities/broadcastNotification.js';

export const updateBroadcastNotificationStatus = async (
  id: number,
  status: 'failed' | 'success',
): Promise<void> => {
  await BroadcastNotification.createQueryBuilder('broadcast_notification')
    .update<BroadcastNotification>(BroadcastNotification, {
      status,
    })
    .where(`id =${id}`)
    .updateEntity(true)
    .execute();
};

export const findBroadcastNotificationById = (
  id: number,
): Promise<BroadcastNotification | null> => {
  return BroadcastNotification.findOne({ where: { id } });
};
