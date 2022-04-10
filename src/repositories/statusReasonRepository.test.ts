import { assert } from 'chai';
import { ProjectStatusReason } from '../entities/projectStatusReason';
import {
  findAllStatusReasons,
  findStatusReasonsByStatusId,
} from './statusReasonRepository';

describe('findAllStatusReasons test cases', () => {
  it('should find all status reasons', async () => {
    await ProjectStatusReason.create({
      statusId: 6,
      description: 'test',
    }).save();
    const allStatusReasons = await findAllStatusReasons();
    assert.isOk(allStatusReasons);
    assert.notEqual(allStatusReasons.length, 0);
  });
});

describe('findStatusReasonsByStatusId test cases', () => {
  it('should find status reasons by statusId', async () => {
    const statusId = 6;
    await ProjectStatusReason.create({
      statusId,
      description: 'test1',
    }).save();
    const statusReasons = await findStatusReasonsByStatusId(statusId);
    statusReasons.forEach(item => {
      assert.equal(statusId, item.status.id);
    });
  });
  it('should not find any status reasons for specific statusId', async () => {
    const statusReasons = await findStatusReasonsByStatusId(10000000);
    assert.equal(statusReasons.length, 0);
  });
});
