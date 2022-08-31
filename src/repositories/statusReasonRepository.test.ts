import { assert } from 'chai';
import { ProjectStatusReason } from '../entities/projectStatusReason';
import {
  findAllStatusReasons,
  findStatusReasonsByStatusId,
} from './statusReasonRepository';
import { ProjectStatus } from '../entities/projectStatus';
import { ProjStatus } from '../entities/project';

describe('findAllStatusReasons test cases', () => {
  it('should find all status reasons', async () => {
    const status = await ProjectStatus.findOne({
      id: ProjStatus.active,
    });
    await ProjectStatusReason.create({
      status,
      description: 'test',
    }).save();
    const allStatusReasons = await findAllStatusReasons();
    assert.isOk(allStatusReasons);
    assert.isNotEmpty(allStatusReasons);
  });
});

describe('findStatusReasonsByStatusId test cases', () => {
  it('should find status reasons by statusId', async () => {
    const status = (await ProjectStatus.findOne({
      id: ProjStatus.active,
    })) as ProjectStatus;
    await ProjectStatusReason.create({
      status,
      description: 'test1',
    }).save();
    const statusReasons = await findStatusReasonsByStatusId(status?.id);
    statusReasons.forEach(item => {
      assert.equal(item.status.id, status?.id);
    });
  });
  it('should not find any status reasons for specific statusId', async () => {
    const statusReasons = await findStatusReasonsByStatusId(10000000);
    assert.isEmpty(statusReasons);
  });
});
