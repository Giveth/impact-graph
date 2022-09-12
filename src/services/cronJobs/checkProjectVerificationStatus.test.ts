import { Project, RevokeSteps } from '../../entities/project';
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
import { findProjectById } from '../../repositories/projectRepository';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

describe(
  'checkProjectVerificationStatus() test cases',
  checkProjectVerificationStatusTestCases,
);

// set days to 60 for test env
// main projectupdate also counts towards updates not only normal updates
function checkProjectVerificationStatusTestCases() {
  it('should send a reminder when project update is more than 30 days old', async () => {
    const remindableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment().subtract(31, 'days').endOf('day'),
    });
    const nonRevokableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
    });
    await checkProjectVerificationStatus();

    const reminderProjectUpdated = await findProjectById(remindableProject.id);
    const nonRevokableProjectUpdated = await findProjectById(
      nonRevokableProject.id,
    );

    assert.isTrue(reminderProjectUpdated?.verified);
    assert.equal(
      reminderProjectUpdated!.verificationStatus,
      RevokeSteps.Reminder,
    );
    assert.isTrue(nonRevokableProjectUpdated!.verified);
  });
  it('should send a warning when project update is more than 60 days old', async () => {
    const warnableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment().subtract(61, 'days').endOf('day'),
    });

    await checkProjectVerificationStatus();

    const warnableProjectUpdate = await findProjectById(warnableProject.id);

    assert.isTrue(warnableProjectUpdate!.verified);
    assert.equal(
      warnableProjectUpdate!.verificationStatus,
      RevokeSteps.Warning,
    );
  });
  it('should send last warning if project was warned and 30 days past', async () => {
    const lastWarningProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment().subtract(91, 'days').endOf('day'),
      verificationStatus: RevokeSteps.Warning,
    });

    await checkProjectVerificationStatus();

    const lastWarningProjectUpdated = await findProjectById(
      lastWarningProject.id,
    );

    assert.isTrue(lastWarningProjectUpdated!.verified);
    assert.equal(
      lastWarningProjectUpdated!.verificationStatus,
      RevokeSteps.LastChance,
    );
  });
  it('should revoke project verification after last chance time frame expired', async () => {
    const revokableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment().subtract(105, 'days').endOf('day'),
      verificationStatus: RevokeSteps.LastChance,
    });

    await checkProjectVerificationStatus();

    const revokableProjectUpdated = await findProjectById(revokableProject.id);

    assert.isFalse(revokableProjectUpdated!.verified);
    assert.equal(
      revokableProjectUpdated!.verificationStatus,
      RevokeSteps.Revoked,
    );

    const revokableProjectHistory =
      await ProjectStatusHistory.createQueryBuilder('project_status_history')
        .where('project_status_history.projectId = :projectId', {
          projectId: revokableProjectUpdated!.id,
        })
        .getOne();

    assert.isNotEmpty(revokableProjectHistory);
    assert.equal(
      revokableProjectHistory!.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED_BY_CRONJOB,
    );
  });
  it('should warn projects that update already expired when feature release', async () => {
    const expiredProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment().subtract(105, 'days').endOf('day'),
    });

    await checkProjectVerificationStatus();

    const expiredProjectUpdated = await findProjectById(expiredProject.id);

    assert.isTrue(expiredProjectUpdated!.verified);
    assert.equal(
      expiredProjectUpdated!.verificationStatus,
      RevokeSteps.UpForRevoking,
    );
  });
  it('should revoke project verification after expired projects time frame is over', async () => {
    const expiredRevokableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment().subtract(150, 'days').endOf('day'),
      verificationStatus: RevokeSteps.UpForRevoking,
    });

    await checkProjectVerificationStatus();

    const expiredRevokableProjectUpdated = await findProjectById(
      expiredRevokableProject.id,
    );

    assert.isFalse(expiredRevokableProjectUpdated!.verified);
    assert.equal(
      expiredRevokableProjectUpdated!.verificationStatus,
      RevokeSteps.Revoked,
    );

    const expiredProjectHistory = await ProjectStatusHistory.createQueryBuilder(
      'project_status_history',
    )
      .where('project_status_history.projectId = :projectId', {
        projectId: expiredRevokableProjectUpdated!.id,
      })
      .getOne();

    assert.isNotEmpty(expiredProjectHistory);
    assert.equal(
      expiredProjectHistory!.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED_BY_CRONJOB,
    );
  });
}
