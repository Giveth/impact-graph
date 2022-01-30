import { updateStatusOfProjects } from './adminBro';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { Project, ProjStatus } from '../entities/project';
import { User } from '../entities/user';
import { assert } from 'chai';
import { messages } from '../utils/messages';

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
      ProjStatus.cancel,
    );
    assert.equal(
      result.notice.message,
      messages.PROJECT_STATUS_UPDATED_SUCCESSFULLY,
    );

    const updatedProject = await Project.findOne({ id: project.id });
    assert.isOk(updatedProject);
    assert.equal(updatedProject?.statusId, ProjStatus.cancel);
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
      ProjStatus.cancel,
    );
    assert.equal(
      result.notice.message,
      'Project(s) status successfully updated',
    );

    const updatedFirstProject = await Project.findOne({ id: firstProject.id });
    assert.isOk(updatedFirstProject);
    assert.equal(updatedFirstProject?.statusId, ProjStatus.cancel);
    assert.isNotTrue(updatedFirstProject?.verified);
    assert.isNotTrue(updatedFirstProject?.listed);

    const updatedSecondProject = await Project.findOne({
      id: secondProject.id,
    });
    assert.isOk(updatedSecondProject);
    assert.equal(updatedSecondProject?.statusId, ProjStatus.cancel);
    assert.isNotTrue(updatedSecondProject?.verified);
    assert.isNotTrue(updatedSecondProject?.listed);
  });
}
