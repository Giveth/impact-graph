import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
  ProjectContacts,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  createProjectVerificationForm,
  findProjectVerificationFormById,
  getInProgressProjectVerificationRequest,
  updateManagingFundsOfProjectVerification,
  updateMilestonesOfProjectVerification,
  updateProjectContactsOfProjectVerification,
  updateProjectPersonalInfoOfProjectVerification,
  updateProjectRegistryOfProjectVerification,
  updateProjectVerificationLastStep,
} from './projectVerificationRepository';
import { assert } from 'chai';

describe(
  'createProjectVerificationForm test cases',
  createProjectVerificationFormTestCases,
);
describe(
  'updateProjectPersonalInfoOfProjectVerification test cases',
  updateProjectPersonalInfoOfProjectVerificationTestCases,
);
describe(
  'updateProjectRegistryOfProjectVerification test cases',
  updateProjectRegistryOfProjectVerificationTestCases,
);
describe(
  'updateProjectContactsOfProjectVerification test cases',
  updateProjectContactsOfProjectVerificationTestCases,
);
describe(
  'updateProjectVerificationLastStep test cases',
  updateProjectVerificationLastStepTestCases,
);
describe(
  'updateMilestonesOfProjectVerification test cases',
  updateMilestonesOfProjectVerificationTestCases,
);
describe(
  'updateManagingFundsOfProjectVerification test cases',
  updateManagingFundsOfProjectVerificationTestCases,
);
describe(
  'getInProgressProjectVerificationRequest test cases',
  getInProgressProjectVerificationRequestTestCases,
);

function createProjectVerificationFormTestCases() {
  it('should create projectVerification successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    assert.equal(
      projectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
  });
}

function updateProjectPersonalInfoOfProjectVerificationTestCases() {
  it('Should update projectVerification successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    const projectPersonalInfo = {
      fullName: 'Carlos',
      walletAddress: 'fdfsdfsdfsf',
      email: 'test@example.com',
    };
    const updatedProjectVerification =
      await updateProjectPersonalInfoOfProjectVerification({
        projectVerificationId: projectVerificationForm.id,
        personalInfo: projectPersonalInfo,
      });

    const test = await findProjectVerificationFormById(
      projectVerificationForm.id,
    );
    assert.equal(
      updatedProjectVerification?.personalInfo.email,
      projectPersonalInfo.email,
    );
  });
}

function updateProjectRegistryOfProjectVerificationTestCases() {
  it('Should update projectVerification successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    const projectRegistry = {
      isNonProfitOrganization: true,
      organizationDescription: '',
      organizationCountry: 'Italy',
      organizationWebsite: '',
    };
    const updatedProjectVerification =
      await updateProjectRegistryOfProjectVerification({
        projectVerificationId: projectVerificationForm.id,
        projectRegistry,
      });
    assert.equal(
      updatedProjectVerification?.projectRegistry.organizationCountry,
      projectRegistry.organizationCountry,
    );
  });
}

function updateProjectContactsOfProjectVerificationTestCases() {
  it('Should update projectVerification successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    const projectContacts: ProjectContacts[] = [
      { name: 'facebook', url: 'facebookAddress' },
      { name: 'instagram', url: 'instagramAddress' },
      { name: 'linkedin', url: 'linkedinAddress' },
      { name: 'linkedinAddress', url: 'linkedinAddressAddress' },
      { name: 'youtube', url: 'youtubeAddress' },
    ];
    const updatedProjectVerification =
      await updateProjectContactsOfProjectVerification({
        projectVerificationId: projectVerificationForm.id,
        projectContacts,
      });
    assert.equal(
      updatedProjectVerification?.projectContacts.length,
      projectContacts.length,
    );
    assert.equal(
      updatedProjectVerification?.projectContacts[0].name,
      projectContacts[0].name,
    );
  });
}
function updateProjectVerificationLastStepTestCases() {
  it('Should update projectVerification last step successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.lastStep =
      PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS;
    const updatedProjectVerification = await updateProjectVerificationLastStep({
      projectVerificationId: projectVerificationForm.id,
      lastStep: PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION,
    });
    assert.equal(
      updatedProjectVerification.lastStep,
      PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION,
    );
  });
}

function updateMilestonesOfProjectVerificationTestCases() {
  it('Should update projectVerification successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    const milestones: Milestones = {
      achievedMilestones: 'We did lots of things',
      achievedMilestonesProof: 'ipfsHash',
      foundationDate: new Date().toString(),
      mission: 'Make world a better place',
    };
    const updatedProjectVerification =
      await updateMilestonesOfProjectVerification({
        projectVerificationId: projectVerificationForm.id,
        milestones,
      });
    assert.equal(
      updatedProjectVerification?.milestones.achievedMilestonesProof,
      milestones.achievedMilestonesProof,
    );
    assert.equal(
      updatedProjectVerification?.milestones.foundationDate,
      milestones.foundationDate,
    );
    assert.equal(
      updatedProjectVerification?.milestones.mission,
      milestones.mission,
    );
  });
}

function updateManagingFundsOfProjectVerificationTestCases() {
  it('Should update projectVerification successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    const managingFunds: ManagingFunds = {
      description: 'description...',
      relatedAddresses: [
        {
          title: 'firstAddress',
          address: generateRandomEtheriumAddress(),
          networkId: 1,
        },
        {
          title: 'secondAddress',
          address: generateRandomEtheriumAddress(),
          networkId: 100,
        },
      ],
    };
    const updatedProjectVerification =
      await updateManagingFundsOfProjectVerification({
        projectVerificationId: projectVerificationForm.id,
        managingFunds,
      });
    assert.equal(
      updatedProjectVerification?.managingFunds.relatedAddresses.length,
      managingFunds.relatedAddresses.length,
    );
    assert.equal(
      updatedProjectVerification?.managingFunds.description,
      managingFunds.description,
    );
  });
}

function getInProgressProjectVerificationRequestTestCases() {
  it('Should find projectVerificationForm with submitted status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const foundProjectVerificationForm =
      await getInProgressProjectVerificationRequest(project.id);
    assert.isOk(foundProjectVerificationForm);
    assert.equal(foundProjectVerificationForm?.id, projectVerificationForm.id);
    assert.equal(
      foundProjectVerificationForm?.status,
      projectVerificationForm.status,
    );
  });
  it('Should find projectVerificationForm with draft status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();
    const foundProjectVerificationForm =
      await getInProgressProjectVerificationRequest(project.id);
    assert.isOk(foundProjectVerificationForm);
    assert.equal(foundProjectVerificationForm?.id, projectVerificationForm.id);
    assert.equal(
      foundProjectVerificationForm?.status,
      projectVerificationForm.status,
    );
  });
}
