import { assert } from 'chai';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../../test/testUtils';
import { Project, ProjStatus } from '../../entities/project';
import { updateProjectListing } from './syncProjectsRequiredForListing';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

describe('updateProjectListing() test cases', updateProjectListingTestCases);

function updateProjectListingTestCases() {
  it('should make project listed if last updated time is for more than 21 days ago', async () => {
    const projectData = createProjectData();
    projectData.listed = undefined;
    projectData.creationDate = moment().subtract(23, 'days');
    projectData.updatedAt = moment().subtract(23, 'days');
    const project = await saveProjectDirectlyToDb(projectData);

    await updateProjectListing();
    const updatedProject = await Project.findOne({ id: project.id });
    assert.isTrue(updatedProject?.listed);
  });

  it('should not make project listed if created less than 21 days ago', async () => {
    const projectData = createProjectData();
    projectData.listed = undefined;
    projectData.creationDate = moment().subtract(12, 'days');
    const project = await saveProjectDirectlyToDb(projectData);

    await updateProjectListing();
    const updatedProject = await Project.findOne({ id: project.id });
    assert.isNotOk(updatedProject?.listed);
  });

  it('should not make project listed if its a draft project', async () => {
    const projectData = createProjectData();
    projectData.listed = undefined;
    projectData.creationDate = moment().subtract(12, 'days');
    projectData.statusId = ProjStatus.drafted;
    const project = await saveProjectDirectlyToDb(projectData);

    await updateProjectListing();
    const updatedProject = await Project.findOne({ id: project.id });
    assert.isNotOk(updatedProject?.listed);
  });
}
