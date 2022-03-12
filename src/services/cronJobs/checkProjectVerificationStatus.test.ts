import { Project, ProjStatus, ProjectUpdate } from '../../entities/project';
import { assert, expect } from 'chai';
import { checkProjectVerificationStatus } from './checkProjectVerificationStatus';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../../test/testUtils';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

describe(
  'checkProjectVerificationStatus() test cases',
  checkProjectVerificationStatusTestCases,
);

// set days to 60 for test env
// main projectupdate also counts towards updates not only normal updates
function checkProjectVerificationStatusTestCases() {
  it('should only revoke badge for projects not recently updated', async () => {
    const revokableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment().subtract(90, 'days').endOf('day'),
    });
    const nonRevokableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
    });
    await checkProjectVerificationStatus();

    const revokableProjectUpdated = await Project.findOne({
      id: revokableProject.id,
    });
    const nonRevokableProjectUpdated = await Project.findOne({
      id: nonRevokableProject.id,
    });

    assert.isFalse(revokableProjectUpdated!.verified);
    assert.isTrue(nonRevokableProjectUpdated!.verified);
  });
}
