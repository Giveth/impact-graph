import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../test/testUtils';
import { assert } from 'chai';
import { findProjectById } from './projectRepository';

describe('findProjectById test cases', () => {
  it('Should find project by id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const foundProject = await findProjectById(project.id);
    assert.isOk(foundProject);
    assert.equal(foundProject?.id, project.id);
  });

  it('should not find project when project doesnt exists', async () => {
    const foundProject = await findProjectById(1000000000);
    assert.isUndefined(foundProject);
  });
});
