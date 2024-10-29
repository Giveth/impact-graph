import { assert } from 'chai';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../../../test/testUtils';
import { PROJECT_VERIFICATION_STATUSES } from '../../../entities/projectVerificationForm';
import { User } from '../../../entities/user';
import {
  createProjectVerificationForm,
  findProjectVerificationFormById,
} from '../../../repositories/projectVerificationRepository';
import { findUserById } from '../../../repositories/userRepository';
import { approveVerificationForms } from './projectVerificationTab';
import { findProjectById } from '../../../repositories/projectRepository';

describe(
  'approveGivbacksEligibilityForm() TestCases',
  approveGivbacksEligibilityFormTestCases,
);

function approveGivbacksEligibilityFormTestCases() {
  it('Should throw error if Givback Eligibility Form is on draft', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });

    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: project.adminUserId,
    });

    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);

    await approveVerificationForms(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectVerificationForm.id),
        },
      },
      true,
    );

    const updatedForm = await findProjectVerificationFormById(
      projectVerificationForm.id,
    );
    assert.isOk(updatedForm);
    assert.equal(updatedForm?.status, PROJECT_VERIFICATION_STATUSES.DRAFT);
  });

  it('Should be able approve Givback Eligibility Form for not draft form', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      isGivbackEligible: false,
    });

    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: project.adminUserId,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);

    await approveVerificationForms(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectVerificationForm.id),
        },
      },
      true,
    );

    const updatedForm = await findProjectVerificationFormById(
      projectVerificationForm.id,
    );
    const updatedPorject = await findProjectById(project.id);
    assert.isOk(updatedForm);
    assert.equal(updatedForm?.status, PROJECT_VERIFICATION_STATUSES.VERIFIED);
    assert.isTrue(updatedPorject?.isGivbackEligible);
    // assert.equal(updatedPorject?.verificationFormStatus);
  });

  it('Should be able to reject Givback Eligibility Form for not draft form', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      isGivbackEligible: false,
    });

    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: project.adminUserId,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);

    await approveVerificationForms(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectVerificationForm.id),
        },
      },
      false,
    );

    const updatedForm = await findProjectVerificationFormById(
      projectVerificationForm.id,
    );
    const updatedPorject = await findProjectById(project.id);

    assert.isOk(updatedForm);
    assert.equal(updatedForm?.status, PROJECT_VERIFICATION_STATUSES.REJECTED);
    assert.isFalse(updatedPorject?.isGivbackEligible);
  });
}
