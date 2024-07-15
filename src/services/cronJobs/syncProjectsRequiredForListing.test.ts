import { assert } from 'chai';
import moment from 'moment';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../../test/testUtils.js';
import { Project, ProjStatus, ReviewStatus } from '../../entities/project.js';
import { updateProjectListing } from './syncProjectsRequiredForListing.js';

describe('updateProjectListing() test cases', updateProjectListingTestCases);

function updateProjectListingTestCases() {
  it('should make project listed if last updated time is for more than 21 days ago', async () => {
    const projectData = createProjectData();
    projectData.listed = undefined;
    projectData.reviewStatus = ReviewStatus.NotReviewed;
    projectData.creationDate = moment().subtract(23, 'days').toDate();
    projectData.updatedAt = moment().subtract(23, 'days').toDate();
    const project = await saveProjectDirectlyToDb(projectData);

    await updateProjectListing();
    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should not make project listed if created less than 21 days ago', async () => {
    const projectData = createProjectData();
    projectData.listed = undefined;
    projectData.reviewStatus = ReviewStatus.NotReviewed;
    projectData.creationDate = moment().subtract(12, 'days').toDate();
    const project = await saveProjectDirectlyToDb(projectData);

    await updateProjectListing();
    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isNotOk(updatedProject?.listed);
    assert.notEqual(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should not make project listed if its a draft project', async () => {
    const projectData = createProjectData();
    projectData.listed = undefined;
    projectData.reviewStatus = ReviewStatus.NotReviewed;
    projectData.creationDate = moment().subtract(12, 'days').toDate();
    projectData.statusId = ProjStatus.drafted;
    const project = await saveProjectDirectlyToDb(projectData);

    await updateProjectListing();
    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isNotOk(updatedProject?.listed);
    assert.notEqual(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });
}
