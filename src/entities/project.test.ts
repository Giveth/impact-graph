import { assert } from 'chai';
import { Project, ProjStatus } from './project';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ProjectStatus } from './projectStatus';
import { ProjectStatusReason } from './projectStatusReason';
import { findOneProjectStatusHistoryByProjectId } from '../repositories/projectSatusHistoryRepository';

describe(
  'addProjectStatusHistoryRecord() test cases',
  addProjectStatusHistoryRecord,
);

function addProjectStatusHistoryRecord() {
  it('Should create a history entity without reason', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const activeStatus = await ProjectStatus.findOne({
      where: { id: ProjStatus.active },
    });
    const cancelStatus = await ProjectStatus.findOne({
      where: {
        id: ProjStatus.cancelled,
      },
    });
    await Project.addProjectStatusHistoryRecord({
      project,
      status: cancelStatus as ProjectStatus,
      prevStatus: activeStatus as ProjectStatus,
      userId: SEED_DATA.ADMIN_USER.id,
    });
    const history = await findOneProjectStatusHistoryByProjectId(project.id);
    assert.isOk(history);
    assert.equal(history?.statusId, cancelStatus?.id);
    assert.equal(history?.prevStatusId, activeStatus?.id);
    assert.isNotOk(history?.reasonId);
  });
  it('Should create a history entity with reason', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const reason = await ProjectStatusReason.findOne({
      where: {},
    });
    const activeStatus = await ProjectStatus.findOne({
      where: { id: ProjStatus.active },
    });
    const cancelStatus = await ProjectStatus.findOne({
      where: {
        id: ProjStatus.deactive,
      },
    });
    await Project.addProjectStatusHistoryRecord({
      project,
      status: cancelStatus as ProjectStatus,
      prevStatus: activeStatus as ProjectStatus,
      reasonId: reason?.id,
      userId: SEED_DATA.ADMIN_USER.id,
    });
    const history = await findOneProjectStatusHistoryByProjectId(project.id);
    assert.isOk(history);
    assert.equal(history?.statusId, cancelStatus?.id);
    assert.equal(history?.prevStatusId, activeStatus?.id);
    assert.equal(history?.reasonId, reason?.id);
  });
}
