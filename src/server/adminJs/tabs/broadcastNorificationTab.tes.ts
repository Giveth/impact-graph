import { assert } from 'chai';
import BroadcastNotification, {
  BROAD_CAST_NOTIFICATION_STATUS,
} from '../../../entities/broadcastNotification.js';
import { findBroadcastNotificationById } from '../../../repositories/broadcastNotificationRepository.js';
import { sendBroadcastNotification } from './broadcastNotificationTab.js';

describe(
  'sendBroadcastNotification() test cases',
  sendBroadcastNotificationTestCases,
);

function sendBroadcastNotificationTestCases() {
  it('should update status of broadcastNotification after sending notifications', async () => {
    const bn = await BroadcastNotification.create({
      title: 'test',
      html: 'test',
      status: BROAD_CAST_NOTIFICATION_STATUS.PENDING,
    }).save();
    assert.equal(bn.status, BROAD_CAST_NOTIFICATION_STATUS.PENDING);
    await sendBroadcastNotification({
      record: {
        params: bn,
      },
    });
    const result = await findBroadcastNotificationById(bn.id);
    assert.equal(result?.status, BROAD_CAST_NOTIFICATION_STATUS.SUCCESS);
  });
}
