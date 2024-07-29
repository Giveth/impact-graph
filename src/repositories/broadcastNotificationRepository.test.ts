import { assert } from 'chai';
import BroadcastNotification, {
  BROAD_CAST_NOTIFICATION_STATUS,
} from '../entities/broadcastNotification.js';
import {
  updateBroadcastNotificationStatus,
  findBroadcastNotificationById,
} from './broadcastNotificationRepository.js';

describe(
  'updateBroadcastNotificationStatus test cases',
  updateBroadcastNotificationStatusTestCases,
);

function updateBroadcastNotificationStatusTestCases() {
  it('should update broadcast notification status to success', async () => {
    const bn = await BroadcastNotification.create({
      title: 'test',
      html: 'test',
      status: BROAD_CAST_NOTIFICATION_STATUS.PENDING,
    }).save();
    assert.equal(bn.status, BROAD_CAST_NOTIFICATION_STATUS.PENDING);
    await updateBroadcastNotificationStatus(
      bn.id,
      BROAD_CAST_NOTIFICATION_STATUS.SUCCESS,
    );
    const result = await findBroadcastNotificationById(bn.id);
    assert.equal(result?.status, BROAD_CAST_NOTIFICATION_STATUS.SUCCESS);
  });
  it('should update broadcast notification status to failed', async () => {
    const bn = await BroadcastNotification.create({
      title: 'test',
      html: 'test',
      status: BROAD_CAST_NOTIFICATION_STATUS.PENDING,
    }).save();
    assert.equal(bn.status, BROAD_CAST_NOTIFICATION_STATUS.PENDING);
    await updateBroadcastNotificationStatus(
      bn.id,
      BROAD_CAST_NOTIFICATION_STATUS.FAILED,
    );
    const result = await findBroadcastNotificationById(bn.id);
    assert.equal(result?.status, BROAD_CAST_NOTIFICATION_STATUS.FAILED);
  });
}
