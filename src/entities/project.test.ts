import { assert } from 'chai';
import { Project, ProjectUpdate, ProjStatus } from './project';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  SEED_DATA,
  sleep,
} from '../../test/testUtils';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ProjectStatus } from './projectStatus';
import { ProjectStatusReason } from './projectStatusReason';

describe(
  'addProjectStatusHistoryRecord() test cases',
  addProjectStatusHistoryRecord,
);

describe('projectUpdate() test cases', projectUpdateTestCases);

function projectUpdateTestCases() {
  it('should update project updatedAt when a new update is added', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const update = await ProjectUpdate.create({
      userId: project.adminUserId,
      projectId: project.id,
      content: 'content',
      title: 'title',
      createdAt: new Date(),
      isMain: false,
    });
    await update.save();
    assert.isTrue(true);
    const projectUpdated = await Project.findOne({ id: project.id });

    assert.isTrue(project.updatedAt < projectUpdated!.updatedAt);
    assert.notEqual(project.updatedAt, projectUpdated!.updatedAt);
  });
}

function addProjectStatusHistoryRecord() {
  it('Should create a history entity without reason', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const activeStatus = await ProjectStatus.findOne({ id: ProjStatus.active });
    const cancelStatus = await ProjectStatus.findOne({
      id: ProjStatus.cancelled,
    });
    await Project.addProjectStatusHistoryRecord({
      project,
      status: cancelStatus as ProjectStatus,
      prevStatus: activeStatus as ProjectStatus,
      userId: SEED_DATA.ADMIN_USER.id,
    });
    const history = await ProjectStatusHistory.findOne({
      project,
    });
    assert.isOk(history);
    assert.equal(history?.statusId, cancelStatus?.id);
    assert.equal(history?.prevStatusId, activeStatus?.id);
    assert.isNotOk(history?.reasonId);
  });
  it('Should create a history entity with reason', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const reason = await ProjectStatusReason.findOne({});
    const activeStatus = await ProjectStatus.findOne({ id: ProjStatus.active });
    const cancelStatus = await ProjectStatus.findOne({
      id: ProjStatus.deactive,
    });
    await Project.addProjectStatusHistoryRecord({
      project,
      status: cancelStatus as ProjectStatus,
      prevStatus: activeStatus as ProjectStatus,
      reasonId: reason?.id,
      userId: SEED_DATA.ADMIN_USER.id,
    });
    const history = await ProjectStatusHistory.findOne({
      project,
    });
    assert.isOk(history);
    assert.equal(history?.statusId, cancelStatus?.id);
    assert.equal(history?.prevStatusId, activeStatus?.id);
    assert.equal(history?.reasonId, reason?.id);
  });
}
