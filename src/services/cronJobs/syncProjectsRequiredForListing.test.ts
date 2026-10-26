import { assert } from 'chai';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../../test/testUtils';
import { Project, ProjStatus, ReviewStatus } from '../../entities/project';
import {
  runCheckPendingProjectListingCronJob,
  updateProjectListing,
} from './syncProjectsRequiredForListing';
import { cronJobGateTestCases } from '../../../test/cronJobGateTestUtils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const moment = require('moment');

describe('updateProjectListing() test cases', updateProjectListingTestCases);
describe(
  'runCheckPendingProjectListingCronJob ENABLE_MAKE_UNREVIEWED_PROJECT_LISTED_CRONJOB gate',
  cronJobGateTestCases({
    envKey: 'ENABLE_MAKE_UNREVIEWED_PROJECT_LISTED_CRONJOB',
    run: runCheckPendingProjectListingCronJob,
  }),
);

function updateProjectListingTestCases() {
  it('should make project listed if last updated time is for more than 21 days ago', async () => {
    const projectData = createProjectData();
    projectData.listed = undefined;
    projectData.reviewStatus = ReviewStatus.NotReviewed;
    projectData.creationDate = moment().subtract(23, 'days');
    projectData.updatedAt = moment().subtract(23, 'days');
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
    projectData.creationDate = moment().subtract(12, 'days');
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
    projectData.creationDate = moment().subtract(12, 'days');
    projectData.statusId = ProjStatus.drafted;
    const project = await saveProjectDirectlyToDb(projectData);

    await updateProjectListing();
    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isNotOk(updatedProject?.listed);
    assert.notEqual(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });
}
