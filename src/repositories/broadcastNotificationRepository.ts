import { Project } from '../entities/project';
import BroadcastNotification, {
  BROAD_CAST_NOTIFICATION_STATUS,
} from '../entities/broadcastNotification';

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
): Promise<BroadcastNotification | undefined> => {
  return BroadcastNotification.findOne({ id });
};
