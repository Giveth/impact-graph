import {
  ManagingFunds,
  Milestones,
  PROJECT_VERIFICATION_STATUSES,
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
  createProjectVerificationRequest,
  updateManagingFundsOfProjectVerification,
  updateMilestonesOfProjectVerification,
  updateProjectContactsOfProjectVerification,
  updateProjectRegistryOfProjectVerification,
} from './projectVerificationRepository';
import { assert } from 'chai';

describe(
  'createProjectVerificationRequest test cases',
  createProjectVerificationRequestTestCases,
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
  'updateMilestonesOfProjectVerification test cases',
  updateMilestonesOfProjectVerificationTestCases,
);
describe(
  'updateManagingFundsOfProjectVerification test cases',
  updateManagingFundsOfProjectVerificationTestCases,
);

function createProjectVerificationRequestTestCases() {
  it('should create projectVerification sucessfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectVerificationForm = await createProjectVerificationRequest({
      projectId: project.id,
      userId: user.id,
    });
    assert.equal(
      projectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
  });
}

function updateProjectRegistryOfProjectVerificationTestCases() {
  it('Should update projectVerification sucessfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectVerificationForm = await createProjectVerificationRequest({
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
  it('Should update projectVerification sucessfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectVerificationForm = await createProjectVerificationRequest({
      projectId: project.id,
      userId: user.id,
    });
    const projectContacts: ProjectContacts = {
      facebook: 'facebookAddress',
      instagram: 'instagramAddress',
      linkedin: 'linkedinAddress',
      twitter: '',
      youtube: 'youtubeAddress',
    };
    const updatedProjectVerification =
      await updateProjectContactsOfProjectVerification({
        projectVerificationId: projectVerificationForm.id,
        projectContacts,
      });
    assert.equal(
      updatedProjectVerification?.projectContacts.facebook,
      projectContacts.facebook,
    );
    assert.equal(
      updatedProjectVerification?.projectContacts.twitter,
      projectContacts.twitter,
    );
  });
}

function updateMilestonesOfProjectVerificationTestCases() {
  it('Should update projectVerification sucessfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectVerificationForm = await createProjectVerificationRequest({
      projectId: project.id,
      userId: user.id,
    });
    const milestones: Milestones = {
      achievedMilestones: 'We did lots of things',
      achievedMilestonesProof: 'ipfsHash',
      foundationDate: new Date(),
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
      updatedProjectVerification?.milestones.mission,
      milestones.mission,
    );
  });
}

function updateManagingFundsOfProjectVerificationTestCases() {
  it('Should update projectVerification sucessfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectVerificationForm = await createProjectVerificationRequest({
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
