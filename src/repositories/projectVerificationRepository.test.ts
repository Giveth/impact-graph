import { assert } from 'chai';
import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
  ProjectContacts,
} from '../entities/projectVerificationForm';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomSolanaAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import {
  createProjectVerificationForm,
  findProjectVerificationFormById,
  getVerificationFormByProjectId,
  makeFormDraft,
  updateManagingFundsOfProjectVerification,
  updateMilestonesOfProjectVerification,
  updateProjectContactsOfProjectVerification,
  updateProjectPersonalInfoOfProjectVerification,
  updateProjectRegistryOfProjectVerification,
  updateProjectVerificationLastStep,
  verifyForm,
  verifyMultipleForms,
} from './projectVerificationRepository';
import { ChainType } from '../types/network';

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

describe('verifyForm test cases', verifyFormTestCases);
describe('makeFormDraft test cases', makeFormDraftTestCases);

describe('verifyMultipleForm test cases', verifyMultipleFormTestCases);

function createProjectVerificationFormTestCases() {
  it('should create projectVerification successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
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
      adminUserId: user.id,
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

    await findProjectVerificationFormById(projectVerificationForm.id);
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
      adminUserId: user.id,
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
      adminUserId: user.id,
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
      adminUserId: user.id,
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
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    const milestones: Milestones = {
      achievedMilestones: 'We did lots of things',
      achievedMilestonesProofs: ['ipfsHash'],
      foundationDate: new Date().toString(),
      mission: 'Make world a better place',
      problem: 'Also Make the world a better place',
      plans: 'Planning to make the world a better place',
      impact: 'Did make the world a better place',
    };
    const updatedProjectVerification =
      await updateMilestonesOfProjectVerification({
        projectVerificationId: projectVerificationForm.id,
        milestones,
      });
    assert.equal(
      updatedProjectVerification?.milestones.achievedMilestonesProofs?.[0],
      milestones.achievedMilestonesProofs?.[0],
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
      adminUserId: user.id,
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
        {
          title: 'thirdAddress',
          address: generateRandomSolanaAddress(),
          networkId: 0,
          chainType: ChainType.SOLANA,
        },
      ],
    };
    const updatedProjectVerification =
      await updateManagingFundsOfProjectVerification({
        projectVerificationId: projectVerificationForm.id,
        managingFunds,
      });
    assert.deepEqual(updatedProjectVerification?.managingFunds, managingFunds);
  });
}

function getInProgressProjectVerificationRequestTestCases() {
  it('Should find projectVerificationForm with submitted status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const foundProjectVerificationForm = await getVerificationFormByProjectId(
      project.id,
    );
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
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();
    const foundProjectVerificationForm = await getVerificationFormByProjectId(
      project.id,
    );
    assert.isOk(foundProjectVerificationForm);
    assert.equal(foundProjectVerificationForm?.id, projectVerificationForm.id);
    assert.equal(
      foundProjectVerificationForm?.status,
      projectVerificationForm.status,
    );
  });
}

function verifyFormTestCases() {
  it('Should verify submitted verification form', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();

    const updateProjectVerificationForm = await verifyForm({
      formId: projectVerificationForm.id,
      verificationStatus: PROJECT_VERIFICATION_STATUSES.VERIFIED,
      adminId: SEED_DATA.ADMIN_USER.id,
    });

    assert.equal(
      updateProjectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.VERIFIED,
    );
    assert.equal(
      updateProjectVerificationForm.reviewer?.id,
      SEED_DATA.ADMIN_USER.id,
    );
    assert.isNotNull(updateProjectVerificationForm?.verifiedAt);
  });
  it('Should rejected submitted verification form', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();

    const updateProjectVerificationForm = await verifyForm({
      formId: projectVerificationForm.id,
      verificationStatus: PROJECT_VERIFICATION_STATUSES.REJECTED,
      adminId: SEED_DATA.ADMIN_USER.id,
    });

    assert.equal(
      updateProjectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.REJECTED,
    );

    assert.equal(
      updateProjectVerificationForm.reviewer?.id,
      SEED_DATA.ADMIN_USER.id,
    );
  });
}

function makeFormDraftTestCases() {
  it('Should make draft submitted verification form', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();

    const updateProjectVerificationForm = await makeFormDraft({
      formId: projectVerificationForm.id,
      adminId: SEED_DATA.ADMIN_USER.id,
    });

    assert.equal(
      updateProjectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      updateProjectVerificationForm.reviewer?.id,
      SEED_DATA.ADMIN_USER.id,
    );
  });
  it('Should make draft rejected verification form', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.REJECTED;
    await projectVerificationForm.save();

    const updateProjectVerificationForm = await makeFormDraft({
      formId: projectVerificationForm.id,
      adminId: SEED_DATA.ADMIN_USER.id,
    });

    assert.equal(
      updateProjectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );

    assert.equal(
      updateProjectVerificationForm?.lastStep,
      PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS,
    );

    assert.equal(
      updateProjectVerificationForm.reviewer?.id,
      SEED_DATA.ADMIN_USER.id,
    );
  });
}

function verifyMultipleFormTestCases() {
  it('Should verify multiple submitted verification forms', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm2 = await createProjectVerificationForm({
      projectId: project2.id,
      userId: user.id,
    });
    projectVerificationForm2.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm2.save();

    assert.equal(
      projectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );
    assert.equal(
      projectVerificationForm2?.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );

    await verifyMultipleForms({
      formIds: [projectVerificationForm.id, projectVerificationForm2.id],
      verificationStatus: PROJECT_VERIFICATION_STATUSES.VERIFIED,
    });

    const updateProjectVerificationForm = await findProjectVerificationFormById(
      projectVerificationForm.id,
    );
    const updateProjectVerificationForm2 =
      await findProjectVerificationFormById(projectVerificationForm2.id);

    assert.equal(
      updateProjectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.VERIFIED,
    );
    assert.equal(
      updateProjectVerificationForm2?.status,
      PROJECT_VERIFICATION_STATUSES.VERIFIED,
    );
    assert.isNotNull(updateProjectVerificationForm2?.verifiedAt);
  });
  it('Should reject multiple submitted verification forms', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      verified: false,
    });
    const projectVerificationForm2 = await createProjectVerificationForm({
      projectId: project2.id,
      userId: user.id,
    });
    projectVerificationForm2.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm2.save();

    assert.equal(
      projectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );
    assert.equal(
      projectVerificationForm2?.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );

    await verifyMultipleForms({
      formIds: [projectVerificationForm.id, projectVerificationForm2.id],
      verificationStatus: PROJECT_VERIFICATION_STATUSES.REJECTED,
    });

    const updateProjectVerificationForm = await findProjectVerificationFormById(
      projectVerificationForm.id,
    );
    const updateProjectVerificationForm2 =
      await findProjectVerificationFormById(projectVerificationForm2.id);

    assert.equal(
      updateProjectVerificationForm?.status,
      PROJECT_VERIFICATION_STATUSES.REJECTED,
    );
    assert.equal(
      updateProjectVerificationForm2?.status,
      PROJECT_VERIFICATION_STATUSES.REJECTED,
    );
  });
}
