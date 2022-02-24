import { listDelist, updateStatusOfProjects, verifyProjects } from './adminBro';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  SEED_DATA,
  sleep,
} from '../../test/testUtils';
import { Project, ProjStatus } from '../entities/project';
import { User } from '../entities/user';
import { assert } from 'chai';
import { messages } from '../utils/messages';
import {
  HISTORY_DESCRIPTIONS,
  ProjectStatusHistory,
} from '../entities/projectStatusHistory';
import { ProjectStatus } from '../entities/projectStatus';

describe(
  'updateStatusOfProjects() test cases',
  updateStatusOfProjectsTestCases,
);
describe('verifyProjects() test cases', verifyProjectsTestCases);
describe('listDelist() test cases', listDelistTestCases);

function updateStatusOfProjectsTestCases() {
  it('should deList and unverified project, when changing status of one project to cancelled', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.equal(updatedProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedProject?.verified);
    assert.isNotTrue(updatedProject?.listed);
  });

  it('should deList and unverified project, when changing status of multi projects to cancelled', async () => {
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedFirstProject = await Project.findOne({ id: firstProject.id });
    assert.isOk(updatedFirstProject);
    assert.equal(updatedFirstProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedFirstProject?.verified);
    assert.isNotTrue(updatedFirstProject?.listed);

    const updatedSecondProject = await Project.findOne({
      id: secondProject.id,
    });
    assert.isOk(updatedSecondProject);
    assert.equal(updatedSecondProject?.statusId, ProjStatus.cancelled);
    assert.isNotTrue(updatedSecondProject?.verified);
    assert.isNotTrue(updatedSecondProject?.listed);
  });

  it('should create history item, when changing status of one project to cancelled', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.equal(updatedProject?.statusId, ProjStatus.cancelled);
    const status = await ProjectStatus.findOne({ id: ProjStatus.cancelled });
    const history = await ProjectStatusHistory.findOne({
      project,
      user: adminUser,
      status,
    });
    assert.isOk(history);
  });
}

function verifyProjectsTestCases() {
  it('should not change listed(true) status when verifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
  });

  it('should not change listed(false) status when verifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
  });

  it('should not change listed(true) status when unVerifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
  });

  it('should not change listed(false) status when unVerifying project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
  });

  it('should create history when make project verified', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await ProjectStatusHistory.findOne({
      project,
      user: adminUser,
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
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await ProjectStatusHistory.findOne({
      project,
      user: adminUser,
    });
    assert.equal(
      history?.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED,
    );
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
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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
      true,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.listed);
    assert.isTrue(updatedProject?.listed);
  });

  it('should not change verified(false) status when listing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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
      true,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isTrue(updatedProject?.listed);
  });

  it('should not change verified(true) status when deListing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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
      false,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
  });

  it('should not change verified(false) status when deListing project', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: false,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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
      false,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.verified);
    assert.isFalse(updatedProject?.listed);
  });

  it('should create history when make project listed', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: true,
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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
      true,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isTrue(updatedProject?.listed);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await ProjectStatusHistory.findOne({
      project,
      user: adminUser,
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
    });
    const adminUser = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
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
      false,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.isFalse(updatedProject?.listed);

    // because we didn't put await before creating history item
    await sleep(10);

    const history = await ProjectStatusHistory.findOne({
      project,
      user: adminUser,
    });
    assert.equal(
      history?.description,
      HISTORY_DESCRIPTIONS.CHANGED_TO_UNLISTED,
    );
  });
}
