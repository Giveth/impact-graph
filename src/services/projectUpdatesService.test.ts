import { assert } from 'chai';
import moment from 'moment';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import { Project, ProjectUpdate } from '../entities/project';
import { updateProjectUpdatesStatistics } from './projectUpdatesService';

describe(
  'updateTotalProjectUpdatesOfAProject test cases',
  updateTotalProjectUpdatesOfAProjectTestCases,
);

function updateTotalProjectUpdatesOfAProjectTestCases() {
  it('should not change updatedAt', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await updateProjectUpdatesStatistics(project.id);
    const updatedProject = (await Project.findOneBy({ id: project.id }))!;
    assert.equal(
      new Date(project.updatedAt).getTime(),
      new Date(updatedProject.updatedAt).getTime(),
    );
    assert.isOk(project.latestUpdateCreationDate);
  });

  it('should update totalProjectUpdates of project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    project.totalProjectUpdates = 0;
    await project.save();
    const latestUpdateCreationDate = moment().toDate();
    await ProjectUpdate.insert({
      userId: project.adminUserId,
      projectId: project.id,
      content: '',
      title: '',
      createdAt: latestUpdateCreationDate,
      isMain: false,
    });
    await updateProjectUpdatesStatistics(project.id);
    const updatedProject = (await Project.findOneBy({ id: project.id }))!;

    assert.equal(updatedProject.totalProjectUpdates, 1);
    assert.equal(
      new Date(updatedProject.updatedAt).getTime(),
      new Date(project.updatedAt).getTime(),
    );
    assert.equal(
      new Date(updatedProject.latestUpdateCreationDate).getTime(),
      new Date(latestUpdateCreationDate).getTime(),
    );
  });
}
