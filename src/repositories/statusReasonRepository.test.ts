import { assert } from 'chai';
import { ProjectStatus } from '../entities/projectStatus';
import { ProjectStatusReason } from '../entities/projectStatusReason';
import {
  findAllStatusReasons,
  findStatusReasonsByStatusId,
} from './statusReasonRepository';

describe('findAllStatusReasons test cases', () => {
  it('should find all status reasons', async () => {
    const status = await ProjectStatus.create({
      symbol: 'deactive',
      name: 'deactive',
      description: 'cancelled description',
    }).save();
    await ProjectStatusReason.create({
      status,
      description: 'test',
    }).save();
    const allStatusReasons = await findAllStatusReasons();
    // tslint:disable-next-line:no-console
    console.log('------------', allStatusReasons);
    allStatusReasons.forEach(item => {
      assert.equal(status.id, item.status.id);
    });
  });
});

describe('findStatusReasonsByStatusId test cases', () => {
  it('should find status reasons by statusId', async () => {
    const status = await ProjectStatus.create({
      symbol: 'pending',
      name: 'pending',
      description: 'pending description',
    }).save();
    await ProjectStatusReason.create({
      status,
      description: 'test1',
    }).save();
    const statusReasons = await findStatusReasonsByStatusId(status.id);
    statusReasons.forEach(item => {
      assert.equal(status.id, item.status.id);
    });
  });
  it('should not find any status reasons for specific statusId', async () => {
    const projectStatusCount = await ProjectStatusReason.count();
    const statusReasons = await findStatusReasonsByStatusId(
      projectStatusCount + 100,
    );
    assert.equal(statusReasons.length, 0);
  });
});
