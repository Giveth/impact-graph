import {
  findProjectBySlug,
  findProjectByWalletAddress,
  projectsWithoutUpdateAfterTimeFrame,
  updateProjectWithVerificationForm,
  verifyMultipleProjects,
  verifyProject,
} from './projectRepository';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { assert } from 'chai';
import { findProjectById } from './projectRepository';
import { createProjectVerificationForm } from './projectVerificationRepository';
import { PROJECT_VERIFICATION_STATUSES } from '../entities/projectVerificationForm';
import { NETWORK_IDS } from '../provider';
import moment from 'moment';

describe(
  'findProjectByWalletAddress test cases',
  findProjectByWalletAddressTestCases,
);

describe(
  'projectsWithoutUpdateAfterTimeFrame Test Cases',
  projectsWithoutUpdateAfterTimeFrameTestCases,
);
describe(
  'updateProjectWithVerificationForm test cases',
  updateProjectWithVerificationFormTestCases,
);

function projectsWithoutUpdateAfterTimeFrameTestCases() {
  it('should return projects created a long time ago', async () => {
    const superExpiredProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment()
        .subtract(1000, 'days')
        .endOf('day')
        .toDate(),
    });

    const nonExpiredProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      projectUpdateCreationDate: moment()
        .subtract(900, 'days')
        .endOf('day')
        .toDate(),
    });

    const projects = await projectsWithoutUpdateAfterTimeFrame(
      moment().subtract(999, 'days').toDate(),
    );

    assert.isOk(projects);
    assert.isOk(
      projects.find(project => project.id === superExpiredProject.id),
    );
    assert.isNotOk(
      projects.find(project => project.id === nonExpiredProject.id),
    );
  });
}

describe('verifyProject test cases', verifyProjectTestCases);
describe('verifyMultipleProjects test cases', verifyMultipleProjectsTestCases);
describe('findProjectById test cases', () => {
  it('Should find project by id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const foundProject = await findProjectById(project.id);
    assert.isOk(foundProject);
    assert.equal(foundProject?.id, project.id);
  });

  it('should not find project when project doesnt exists', async () => {
    const foundProject = await findProjectById(1000000000);
    assert.isUndefined(foundProject);
  });
});
describe('findProjectBySlug test cases', () => {
  it('Should find project by id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const foundProject = await findProjectBySlug(project.slug as string);
    assert.isOk(foundProject);
    assert.equal(foundProject?.id, project.id);
  });

  it('should not find project when project doesnt exists', async () => {
    const foundProject = await findProjectBySlug(new Date().toString());
    assert.isUndefined(foundProject);
  });
});

function findProjectByWalletAddressTestCases() {
  it('should find project by walletAddress', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should find project by walletAddress upper case', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toUpperCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should find project by walletAddress lower case', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toLowerCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
  });
  it('should join with status successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const fetchedProject = await findProjectByWalletAddress(
      project.walletAddress?.toLowerCase() as string,
    );
    assert.isOk(fetchedProject);
    assert.equal(fetchedProject?.id, project.id);
    assert.isOk(fetchedProject?.status?.id);
  });
}

function updateProjectWithVerificationFormTestCases() {
  it('update project with verification form data', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const fetchedProject = await findProjectById(project.id);
    assert.equal(
      fetchedProject?.addresses?.length,
      Object.keys(NETWORK_IDS).length,
    );
    assert.equal(fetchedProject?.addresses?.[0].address, project.walletAddress);
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    const relatedAddress = generateRandomEtheriumAddress();
    projectVerificationForm.managingFunds = {
      description: 'hi',
      relatedAddresses: [
        {
          title: 'address1',
          address: relatedAddress,
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();

    assert.equal(
      projectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );

    await updateProjectWithVerificationForm(projectVerificationForm, project);
    const fetchedProject2 = await findProjectById(project.id);
    assert.equal(
      fetchedProject2?.addresses?.length,
      Object.keys(NETWORK_IDS).length + 1,
    );
    assert.isOk(
      fetchedProject2?.addresses?.find(
        projectAddress => projectAddress.address === relatedAddress,
      ),
    );
  });
}

function verifyProjectTestCases() {
  it('should verify project successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    assert.isFalse(project?.verified);

    await verifyProject({
      projectId: project.id,
      verified: true,
    });
    const fetchedProject = await findProjectById(project.id);
    assert.isTrue(fetchedProject?.verified);
  });
  it('should unVerify project successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: true,
    });
    assert.isTrue(project?.verified);

    await verifyProject({
      projectId: project.id,
      verified: false,
    });
    const fetchedProject = await findProjectById(project.id);
    assert.isFalse(fetchedProject?.verified);
  });
}

function verifyMultipleProjectsTestCases() {
  it('should verify two project successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    assert.isFalse(project?.verified);
    assert.isFalse(project2?.verified);

    await verifyMultipleProjects({
      projectsIds: [project.id, project2.id],
      verified: true,
    });
    const fetchedProject = await findProjectById(project.id);
    const fetchedProject2 = await findProjectById(project2.id);
    assert.isTrue(fetchedProject?.verified);
    assert.isTrue(fetchedProject2?.verified);
  });
  it('should unVerify two project successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: true,
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: true,
    });
    assert.isTrue(project?.verified);
    assert.isTrue(project2?.verified);

    await verifyMultipleProjects({
      projectsIds: [project.id, project2.id],
      verified: false,
    });
    const fetchedProject = await findProjectById(project.id);
    const fetchedProject2 = await findProjectById(project2.id);
    assert.isFalse(fetchedProject?.verified);
    assert.isFalse(fetchedProject2?.verified);
  });
}
