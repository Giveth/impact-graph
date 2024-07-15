import { assert } from 'chai';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../test/testUtils.js';
import { Project, ProjectUpdate } from '../entities/project.js';
import { updateTotalProjectUpdatesOfAProject } from './projectUpdatesService.js';
import { findProjectById } from '../repositories/projectRepository.js';

describe(
  'updateTotalProjectUpdatesOfAProject test cases',
  updateTotalProjectUpdatesOfAProjectTestCases,
);

function updateTotalProjectUpdatesOfAProjectTestCases() {
  it('should not change updatedAt', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await updateTotalProjectUpdatesOfAProject(project.id);
    const updatedProject = (await findProjectById(project.id)) as Project;
    assert.equal(
      new Date(project.updatedAt).getTime(),
      new Date(updatedProject.updatedAt).getTime(),
    );
  });

  it('should update totalProjectUpdates of project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    project.totalProjectUpdates = 0;
    await project.save();
    await ProjectUpdate.query(`
    INSERT INTO public.project_update (
      "userId","projectId",content,title,"createdAt","isMain"
    ) VALUES (
      ${project.adminUserId}, ${project.id}, '', '', '${
        new Date().toISOString().split('T')[0]
      }', false
    )`);
    await updateTotalProjectUpdatesOfAProject(project.id);
    const updatedProject = (await findProjectById(project.id)) as Project;

    assert.equal(updatedProject.totalProjectUpdates, 1);
    assert.equal(
      new Date(updatedProject.updatedAt).getTime(),
      new Date(project.updatedAt).getTime(),
    );
  });
}
