import { assert } from 'chai';
import moment from 'moment';
import { RevokeSteps } from '../../entities/project.js';

import { checkProjectVerificationStatus } from './checkProjectVerificationStatus.js';
import {
  createProjectData,
  saveProjectDirectlyToDb,
} from '../../../test/testUtils.js';
import { findProjectById } from '../../repositories/projectRepository.js';

describe(
  'checkProjectVerificationStatus() test cases',
  checkProjectVerificationStatusTestCases,
);

// set days to 60 for test env
// main projectupdate also counts towards updates not only normal updates
function checkProjectVerificationStatusTestCases() {
  it('should send a warning when project update is more than 45 days old', async () => {
    const warnableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      latestUpdateCreationDate: moment()
        .subtract(46, 'days')
        .endOf('day')
        .toDate(),
      verificationStatus: RevokeSteps.Reminder,
    });

    await checkProjectVerificationStatus();

    const warnableProjectUpdate = await findProjectById(warnableProject.id);

    assert.isTrue(warnableProjectUpdate!.verified);
    assert.equal(
      warnableProjectUpdate!.verificationStatus,
      RevokeSteps.Warning,
    );
  });
  it('should send a last chance warning when project update is more than 90 days old', async () => {
    const warnableProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      latestUpdateCreationDate: moment()
        .subtract(91, 'days')
        .endOf('day')
        .toDate(),
      verificationStatus: RevokeSteps.Warning,
    });

    await checkProjectVerificationStatus();

    const warnableProjectUpdate = await findProjectById(warnableProject.id);

    assert.isTrue(warnableProjectUpdate!.verified);
    assert.equal(
      warnableProjectUpdate!.verificationStatus,
      RevokeSteps.LastChance,
    );
  });
  it('should change project verificationStatus to upForRevoking after last chance time frame expired', async () => {
    const lastWarningProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      latestUpdateCreationDate: moment()
        .subtract(105, 'days')
        .endOf('day')
        .toDate(),
      verificationStatus: RevokeSteps.LastChance,
    });

    await checkProjectVerificationStatus();

    const lastWarningProjectUpdated = await findProjectById(
      lastWarningProject.id,
    );

    assert.isTrue(lastWarningProjectUpdated!.verified);
    assert.equal(
      lastWarningProjectUpdated!.verificationStatus,
      RevokeSteps.UpForRevoking,
    );
  });
  it('should not check updates for imported projects', async () => {
    const importedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      latestUpdateCreationDate: moment()
        .subtract(105, 'days')
        .endOf('day')
        .toDate(),
      isImported: true,
    });

    await checkProjectVerificationStatus();

    const importedProjectUpdated = await findProjectById(importedProject.id);

    assert.isTrue(importedProjectUpdated!.verified);
    assert.equal(importedProjectUpdated!.verificationStatus, null);
  });
  // it('should revoke project verification after last chance time frame expired', async () => {
  //   const revokableProject = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     title: String(new Date().getTime()),
  //     slug: String(new Date().getTime()),
  //     verified: true,
  //     updatedAt: moment().subtract(105, 'days').endOf('day').toDate(),
  //     projectUpdateCreationDate: moment().subtract(105, 'days').endOf('day'),
  //     verificationStatus: RevokeSteps.LastChance,
  //   });
  //
  //   const projectVerificationForm = await createProjectVerificationForm({
  //     projectId: revokableProject.id,
  //     userId: Number(revokableProject.admin),
  //   });
  //
  //   projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
  //   await projectVerificationForm.save();
  //
  //   await checkProjectVerificationStatus();
  //
  //   const revokableProjectUpdated = await Project.createQueryBuilder('project')
  //     .leftJoinAndSelect(
  //       'project.projectVerificationForm',
  //       'projectVerificationForm',
  //     )
  //     .where('project.id = :id', { id: revokableProject.id })
  //     .getOne();
  //
  //   assert.isFalse(revokableProjectUpdated!.verified);
  //   assert.equal(
  //     revokableProjectUpdated!.verificationStatus,
  //     RevokeSteps.Revoked,
  //   );
  //
  //   const revokableProjectHistory =
  //     await ProjectStatusHistory.createQueryBuilder('project_status_history')
  //       .where('project_status_history.projectId = :projectId', {
  //         projectId: revokableProjectUpdated!.id,
  //       })
  //       .getOne();
  //
  //   assert.isNotEmpty(revokableProjectHistory);
  //   assert.equal(
  //     revokableProjectHistory!.description,
  //     HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED_BY_CRONJOB,
  //   );
  //
  //   // set project verification as draft
  //   assert.notEqual(
  //     projectVerificationForm.status,
  //     revokableProjectUpdated?.projectVerificationForm?.status,
  //   );
  // });
  // it('should warn projects that update already expired when feature release', async () => {
  //   const expiredProject = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     title: String(new Date().getTime()),
  //     slug: String(new Date().getTime()),
  //     verified: true,
  //     updatedAt: moment().subtract(105, 'days').endOf('day').toDate(),
  //     projectUpdateCreationDate: moment().subtract(105, 'days').endOf('day'),
  //   });
  //
  //   await checkProjectVerificationStatus();
  //
  //   const expiredProjectUpdated = await findProjectById(expiredProject.id);
  //
  //   assert.isTrue(expiredProjectUpdated!.verified);
  //   assert.equal(
  //     expiredProjectUpdated!.verificationStatus,
  //     RevokeSteps.UpForRevoking,
  //   );
  // });
  // it('should revoke project verification after expired projects time frame is over', async () => {
  //   const expiredRevokableProject = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     title: String(new Date().getTime()),
  //     slug: String(new Date().getTime()),
  //     verified: true,
  //     updatedAt: moment().subtract(300, 'days').endOf('day').toDate(),
  //     projectUpdateCreationDate: moment().subtract(300, 'days').endOf('day'),
  //     verificationStatus: RevokeSteps.UpForRevoking,
  //   });
  //
  //   const projectVerificationForm = await createProjectVerificationForm({
  //     projectId: expiredRevokableProject.id,
  //     userId: Number(expiredRevokableProject.admin),
  //   });
  //
  //   projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
  //   await projectVerificationForm.save();
  //
  //   // setup an old date in the test.env (last year), so this is instantly revoked
  //
  //   await checkProjectVerificationStatus();
  //
  //   const expiredRevokableProjectUpdated = await Project.createQueryBuilder(
  //     'project',
  //   )
  //     .leftJoinAndSelect(
  //       'project.projectVerificationForm',
  //       'projectVerificationForm',
  //     )
  //     .where('project.id = :id', { id: expiredRevokableProject.id })
  //     .getOne();
  //
  //   assert.isFalse(expiredRevokableProjectUpdated!.verified);
  //   assert.equal(
  //     expiredRevokableProjectUpdated!.verificationStatus,
  //     RevokeSteps.Revoked,
  //   );
  //
  //   const expiredProjectHistory = await ProjectStatusHistory.createQueryBuilder(
  //     'project_status_history',
  //   )
  //     .where('project_status_history.projectId = :projectId', {
  //       projectId: expiredRevokableProjectUpdated!.id,
  //     })
  //     .getOne();
  //
  //   assert.isNotEmpty(expiredProjectHistory);
  //   assert.equal(
  //     expiredProjectHistory!.description,
  //     HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED_BY_CRONJOB,
  //   );
  //
  //   // set project verification as draft
  //   assert.notEqual(
  //     projectVerificationForm.status,
  //     expiredRevokableProjectUpdated?.projectVerificationForm?.status,
  //   );
  // });
}
