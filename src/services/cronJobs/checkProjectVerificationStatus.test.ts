import { Project } from '../../entities/project';
import {
  ProjectStatusHistory,
  HISTORY_DESCRIPTIONS,
} from '../../entities/projectStatusHistory';
import { assert } from 'chai';
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

    const revokableProjectHistory =
      await ProjectStatusHistory.createQueryBuilder('project_status_history')
        .where('project_status_history.projectId = :projectId', {
          projectId: revokableProjectUpdated!.id,
        })
        .getOne();

    // test history was created
    assert.isNotEmpty(revokableProjectHistory);
    assert.equal(
      revokableProjectHistory!.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED_BY_CRONJOB,
    );
  });
}
