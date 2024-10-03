import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
  sleep,
} from '../../../../test/testUtils';
import {
  Project,
  ProjectUpdate,
  ProjStatus,
  ReviewStatus,
  RevokeSteps,
} from '../../../entities/project';
import { User } from '../../../entities/user';
import { findOneProjectStatusHistory } from '../../../repositories/projectSatusHistoryRepository';
import { HISTORY_DESCRIPTIONS } from '../../../entities/projectStatusHistory';
import {
  createProjectVerificationForm,
  getVerificationFormByProjectId,
} from '../../../repositories/projectVerificationRepository';
import {
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
} from '../../../entities/projectVerificationForm';
import { findUserById } from '../../../repositories/userRepository';
import {
  findProjectById,
  verifyMultipleProjects,
} from '../../../repositories/projectRepository';
import { FeaturedUpdate } from '../../../entities/featuredUpdate';
import {
  addFeaturedProjectUpdate,
  exportProjectsWithFiltersToCsv,
  listDelist,
  revokeGivbacksEligibility,
  updateStatusOfProjects,
  verifyProjects,
} from './projectsTab';
import { messages } from '../../../utils/messages';
import { ProjectStatus } from '../../../entities/projectStatus';

describe(
  'verifyMultipleProjects() test cases',
  verifyMultipleProjectsTestCases,
);

describe('verifyProjects() test cases', verifyProjectsTestCases);
describe('listDelist() test cases', listDelistTestCases);
describe(
  'addToFeaturedProjectUpdate() TestCases',
  addToFeaturedProjectUpdateTestCases,
);
describe(
  'exportProjectsWithFiltersToCsv() test cases',
  exportProjectsWithFiltersToCsvTestCases,
);

describe(
  'updateStatusOfProjects() test cases',
  updateStatusOfProjectsTestCases,
);

function updateStatusOfProjectsTestCases() {
  it('should deList and unverified project, when changing status of one project to cancelled', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    const result = await updateStatusOfProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ProjStatus.cancelled,
    );
    assert.equal(
      result.notice.message,
      messages.PROJECT_STATUS_UPDATED_SUCCESSFULLY,
    );

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.equal(updatedProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedProject?.verified);
    assert.isNotTrue(updatedProject?.listed);
    assert.notEqual(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should deList and unverified project, when changing status of multi projects to cancelled', async () => {
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    const result = await updateStatusOfProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: `${firstProject.id},${secondProject.id}`,
        },
      },
      ProjStatus.cancelled,
    );
    assert.equal(
      result.notice.message,
      'Project(s) status successfully updated',
    );

    const updatedFirstProject = await findProjectById(firstProject.id);
    assert.isOk(updatedFirstProject);
    assert.equal(updatedFirstProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedFirstProject?.verified);
    assert.isNotTrue(updatedFirstProject?.listed);
    assert.notEqual(updatedFirstProject?.reviewStatus, ReviewStatus.Listed);

    const updatedSecondProject = await findProjectById(secondProject.id);
    assert.isOk(updatedSecondProject);
    assert.equal(updatedSecondProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedSecondProject?.verified);
    assert.isNotTrue(updatedSecondProject?.listed);
    assert.notEqual(updatedSecondProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should create history item, when changing status of one project to cancelled', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    const result = await updateStatusOfProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ProjStatus.cancelled,
    );
    assert.equal(
      result.notice.message,
      messages.PROJECT_STATUS_UPDATED_SUCCESSFULLY,
    );

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.equal(updatedProject?.statusId, ProjStatus.cancelled);
    const status = await ProjectStatus.findOne({
      where: { id: ProjStatus.cancelled },
    });

    // We should wait to history be created because creating histories use fire and forget strategy
    await sleep(50);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
      statusId: status?.id,
    });
    assert.isOk(history);
  });
}

function listDelistTestCases() {
  it('should not change verified(true) status when listing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ReviewStatus.Listed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should not change verified(false) status when listing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ReviewStatus.Listed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
  });

  it('should not change verified(true) status when deListing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ReviewStatus.NotListed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('should not change verified(false) status when deListing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ReviewStatus.NotListed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('should create history when make project listed', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ReviewStatus.Listed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);

    // because we didn't put await before creating history item
    await sleep(50);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
    });
    assert.equal(history?.description, HISTORY_DESCRIPTIONS.CHANGED_TO_LISTED);
  });

  it('should create history when make project unlisted', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const adminUser = await User.findOne({
      where: { id: SEED_DATA.ADMIN_USER.id },
    });
    await listDelist(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      ReviewStatus.NotListed,
    );

    const updatedProject = await Project.findOne({ where: { id: project.id } });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
    });
    assert.equal(
      history?.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNLISTED,
    );
  });
}
function verifyProjectsTestCases() {
  it('should unverify projects when the badge is revoked and set verification form as draft', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: project.adminUserId,
    });

    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      false,
    );
    await revokeGivbacksEligibility(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
    );

    const updatedProject = await findProjectById(project.id);
    const updatedVerificationForm = await getVerificationFormByProjectId(
      project.id,
    );
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
    assert.equal(
      updatedVerificationForm!.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      updatedVerificationForm!.lastStep,
      PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS,
    );
    assert.equal(updatedVerificationForm!.isTermAndConditionsAccepted, false);
    assert.notEqual(
      projectVerificationForm.status,
      updatedVerificationForm!.status,
    );
    assert.notEqual(
      updatedProject?.verificationStatus,
      project.verificationStatus,
    );
    assert.equal(updatedProject?.verificationStatus, RevokeSteps.Revoked);
  });
  it('should not change listed(true) status when verifying project and set verification form as verified', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      verificationStatus: RevokeSteps.Revoked,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: project.adminUserId,
    });

    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      true,
    );

    const updatedProject = await findProjectById(project.id);
    const updatedVerificationForm = await getVerificationFormByProjectId(
      project.id,
    );
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
    assert.isTrue(project!.verificationStatus === RevokeSteps.Revoked);
    assert.isTrue(
      updatedProject!.verificationStatus === project.verificationStatus,
    );
    assert.equal(
      updatedVerificationForm!.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      updatedVerificationForm!.isTermAndConditionsAccepted,
      projectVerificationForm.isTermAndConditionsAccepted,
    );
    assert.equal(
      updatedVerificationForm!.lastStep,
      projectVerificationForm.lastStep,
    );
  });

  it('should not change listed(false) status when verifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      true,
    );

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('should not change listed(true) status when unVerifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
      verificationStatus: RevokeSteps.Revoked,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: project.adminUserId,
    });

    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
    await projectVerificationForm.save();

    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      false,
    );

    const updatedProject = await findProjectById(project.id);
    const updatedVerificationForm = await getVerificationFormByProjectId(
      project.id,
    );
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.Listed);
    assert.isTrue(updatedProject!.verificationStatus === RevokeSteps.Revoked);
    assert.equal(
      updatedVerificationForm!.status,
      PROJECT_VERIFICATION_STATUSES.VERIFIED,
    );
    assert.equal(
      updatedVerificationForm!.isTermAndConditionsAccepted,
      projectVerificationForm.isTermAndConditionsAccepted,
    );
    assert.equal(
      updatedVerificationForm!.lastStep,
      projectVerificationForm.lastStep,
    );
  });

  it('should not change listed(false) status when unVerifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      false,
    );

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('should create history when make project verified', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      true,
    );

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
    });
    assert.equal(
      history?.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_VERIFIED,
    );
  });

  it('should create history when make project unverified', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    await verifyProjects(
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      false,
    );

    const updatedProject = await findProjectById(project.id);
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await findOneProjectStatusHistory({
      projectId: project.id,
      userId: adminUser?.id,
    });
    assert.equal(
      history?.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED,
    );
  });
}

function exportProjectsWithFiltersToCsvTestCases() {
  it('should  return error because google api key is not set', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const adminUser = await findUserById(SEED_DATA.ADMIN_USER.id);
    const result = await exportProjectsWithFiltersToCsv(
      {
        query: {
          recordIds: '',
        },
        payload: {},
        record: {},
      },
      {
        query: {
          recordIds: String(project.id),
        },
      },
      {
        currentAdmin: adminUser as User,
        h: {},
        resource: {},
        records: [],
      },
    );

    assert.equal(result?.notice.type, 'danger');
    // If we set GOOGLE_SPREADSHEETS_PRIVATE_KEY,GOOGLE_SPREADSHEETS_CLIENT_EMAIL,GOOGLE_PROJECT_EXPORTS_SPREADSHEET_ID
    // to .env.test we would not get this error anymore
    assert.equal(result?.notice.message, 'No key or keyFile set.');
  });
}

function addToFeaturedProjectUpdateTestCases() {
  it('should add a project and selected update to the featuredProject entity', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
        title: String(new Date().getTime()),
        slug: String(new Date().getTime()),
        verified: true,
        listed: true,
      },
      user,
    );

    const projectUpdate = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project.id,
      content: 'TestProjectUpdate1',
      title: 'testEditProjectUpdate1',
      createdAt: new Date(),
      isMain: false,
    }).save();

    await addFeaturedProjectUpdate(
      {
        currentAdmin: user as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectUpdate.id),
        },
      },
    );

    const featuredProjectUpdate = await FeaturedUpdate.createQueryBuilder(
      'featuredUpdate',
    )
      .where(
        'featuredUpdate.projectId = :projectId AND featuredUpdate.projectUpdateId = :projectUpdateId',
        { projectId: project.id, projectUpdateId: projectUpdate.id },
      )
      .getOne();
    assert.isOk(featuredProjectUpdate);
    assert.equal(featuredProjectUpdate?.projectId, project.id);
    assert.equal(featuredProjectUpdate?.projectUpdateId, projectUpdate.id);
  });

  it('should not add the same project twice to the featured project entity', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
        title: String(new Date().getTime()),
        slug: String(new Date().getTime()),
        verified: true,
        listed: true,
      },
      user,
    );

    const projectUpdate = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project.id,
      content: 'TestProjectUpdate1',
      title: 'testEditProjectUpdate1',
      createdAt: new Date(),
      isMain: false,
    }).save();

    await addFeaturedProjectUpdate(
      {
        currentAdmin: user as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectUpdate.id),
        },
      },
    );

    await addFeaturedProjectUpdate(
      {
        currentAdmin: user as User,
        h: {},
        resource: {},
        records: [],
      },
      {
        query: {
          recordIds: String(projectUpdate.id),
        },
      },
    );

    const featuredProjectUpdates = await FeaturedUpdate.find({
      where: { projectId: project.id, projectUpdateId: projectUpdate.id },
    });

    assert.isOk(featuredProjectUpdates);
    assert.equal(featuredProjectUpdates.length, 1);
    assert.equal(featuredProjectUpdates[0]?.projectId, project.id);
    assert.equal(featuredProjectUpdates[0]?.projectUpdateId, projectUpdate.id);
  });
}

function verifyMultipleProjectsTestCases() {
  it('should verify projects and set verificationStatus as null', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      verificationStatus: 'revoked',
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      verificationStatus: 'reminder',
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    await verifyMultipleProjects({
      verified: true,
      projectsIds: [project1.id, project2.id],
    });

    const project1Updated = await Project.findOne({
      where: { id: project1.id },
    });
    const project2Updated = await Project.findOne({
      where: { id: project2.id },
    });

    assert.equal(project1Updated?.verificationStatus, 'revoked');

    assert.notEqual(project1Updated?.verified, false);
    assert.equal(project1Updated?.verified, true);

    assert.equal(project2Updated?.verificationStatus, 'reminder');

    assert.notEqual(project2Updated?.verified, false);
    assert.equal(project2Updated?.verified, true);
  });
  it('should unverify projects and not change the verificationStatus', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      verificationStatus: 'revoked',
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      verificationStatus: 'reminder',
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    await verifyMultipleProjects({
      verified: false,
      projectsIds: [project1.id, project2.id],
    });

    const project1Updated = await Project.findOne({
      where: { id: project1.id },
    });
    const project2Updated = await Project.findOne({
      where: { id: project2.id },
    });

    assert.equal(project1Updated?.verificationStatus, 'revoked');
    assert.notEqual(project1Updated?.verificationStatus, null);
    assert.equal(project1Updated?.verified, false);
    assert.notEqual(project1Updated?.verified, true);

    assert.equal(project2Updated?.verificationStatus, 'reminder');
    assert.notEqual(project2Updated?.verificationStatus, null);
    assert.equal(project2Updated?.verified, false);
    assert.notEqual(project2Updated?.verified, true);
  });
}
