import { assert } from 'chai';
import axios from 'axios';
import {
  createProjectData,
  generateConfirmationEmailToken,
  generateRandomEtheriumAddress,
  generateRandomSolanaAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../test/testUtils';
import {
  createProjectVerificationFormMutation,
  getAllowedCountries,
  getCurrentProjectVerificationFormQuery,
  projectVerificationConfirmEmail,
  projectVerificationSendEmailConfirmation,
  updateProjectVerificationFormMutation,
} from '../../test/graphqlQueries';
import {
  ManagingFunds,
  Milestones,
  PersonalInfo,
  PROJECT_VERIFICATION_STATUSES,
  PROJECT_VERIFICATION_STEPS,
  ProjectContacts,
  ProjectRegistry,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { ProjStatus, ReviewStatus } from '../entities/project';
import {
  createProjectVerificationForm,
  findProjectVerificationFormById,
} from '../repositories/projectVerificationRepository';
import { errorMessages } from '../utils/errorMessages';
import { NETWORK_IDS } from '../provider';
import { countriesList, generateRandomString } from '../utils/utils';
import { createSocialProfile } from '../repositories/socialProfileRepository';
import { SOCIAL_NETWORKS } from '../entities/socialProfile';
import { ChainType } from '../types/network';
import { getDefaultSolanaChainId } from '../services/chains';

describe(
  'createProjectVerification test cases',
  createProjectVerificationFormMutationTestCases,
);
describe(
  'getCurrentProjectVerificationForm test cases',
  getCurrentProjectVerificationFormTestCases,
);

describe(
  'updateProjectVerificationFormMutation test cases',
  updateProjectVerificationFormMutationTestCases,
);

describe('getAllowedCountries test cases', getAllowedCountriesTestCases);
describe(
  'projectVerificationSendEmailConfirmation test cases',
  projectVerificationSendEmailConfirmationTestCases,
);
describe(
  'projectVerificationConfirmEmail test cases',
  projectVerificationConfirmEmailTestCases,
);

function createProjectVerificationFormMutationTestCases() {
  it('should create project verification form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.data.createProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.isNotOk(
      result.data.data.createProjectVerificationForm.managingFunds,
    );
    assert.isNotOk(
      result.data.data.createProjectVerificationForm.projectContacts,
    );
    assert.isNotOk(
      result.data.data.createProjectVerificationForm.projectRegistry,
    );
  });
  it('should not create project verification because user that is authenticated is not project owner', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user1.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const accessToken = await generateTestAccessToken(user2.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      'You are not the owner of this project.',
    );
  });
  it('should not create project verification because project verified before', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'Project is already verified.');
  });
  it('should not create project verification because project not found', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          slug: new Date().toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'Project not found.');
  });
  it('should not create project verification because user not found', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const result = await axios.post(graphqlUrl, {
      query: createProjectVerificationFormMutation,
      variables: {
        slug: project.slug,
      },
    });
    assert.equal(result.data.errors[0].message, 'unAuthorized');
  });
  it('should not create project verification because user have draft project verification', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const accessToken = await generateTestAccessToken(user.id);

    await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
    }).save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectVerificationFormMutation,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      'There is an ongoing project verification request for this project',
    );
  });
}

function updateProjectVerificationFormMutationTestCases() {
  const personalInfo: PersonalInfo = {
    email: 'test@example.com',
    fullName: 'test',
    walletAddress: 'xxxxx',
  };
  const projectContacts: ProjectContacts[] = [
    { name: 'facebook', url: 'facebookAddress' },
    { name: 'instagram', url: 'instagramAddress' },
    { name: 'linkedin', url: 'linkedinAddress' },
    { name: 'linkedinAddress', url: 'linkedinAddressAddress' },
    { name: 'youtube', url: 'youtubeAddress' },
  ];
  const projectRegistry: ProjectRegistry = {
    organizationWebsite: 'org website',
    organizationCountry: 'France',
    isNonProfitOrganization: true,
    organizationDescription: '',
    organizationName: 'organizationName',
    attachments: ['an ipfs link'],
  };
  const milestones: Milestones = {
    mission: 'mission',
    achievedMilestonesProofs: ['an ipfs hash'],
    achievedMilestones: 'lots of work',
    foundationDate: new Date().toString(),
  };
  const managingFunds: ManagingFunds = {
    description: 'description!!!',
    relatedAddresses: [
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.MAIN_NET,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.GOERLI,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.XDAI,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.OPTIMISTIC,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.POLYGON,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.CELO_ALFAJORES,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.CELO,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.ARBITRUM_MAINNET,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.ARBITRUM_SEPOLIA,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.BASE_MAINNET,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.BASE_SEPOLIA,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.ETC,
        title: 'test title',
      },
      {
        address: generateRandomEtheriumAddress(),
        networkId: NETWORK_IDS.MORDOR_ETC_TESTNET,
        title: 'test title',
        chainType: ChainType.EVM,
      },
      // {
      //   address: generateRandomSolanaAddress(),
      //   networkId: NETWORK_IDS.SOLANA_MAINNET,
      //   title: 'test title',
      //   chainType: ChainType.SOLANA,
      // },
      {
        address: generateRandomSolanaAddress(),
        // frontend may not send networkId for solana
        networkId: 0,
        title: 'test title',
        chainType: ChainType.SOLANA,
      },
    ],
  };
  it('should update project verification with projectContacts form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      emailConfirmed: true,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS,
            projectContacts,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);
    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.projectContacts.length,
      projectContacts.length,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.projectContacts[0].url,
      projectContacts[0].url,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.projectContacts[1].name,
      projectContacts[1].name,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS,
    );
  });
  it('should update project verification with personalInfo form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.PERSONAL_INFO,
            personalInfo,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);
    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.personalInfo.email,
      personalInfo.email,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.personalInfo.fullName,
      personalInfo.fullName,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.personalInfo.walletAddress,
      personalInfo.walletAddress,
    );
    assert.isNotOk(result.data.data.updateProjectVerificationForm.lastStep);
  });
  it('should update project verification with personalInfo form successfully and last step should get updated', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      emailConfirmed: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.PERSONAL_INFO,
            personalInfo,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);
    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.personalInfo.email,
      personalInfo.email,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.personalInfo.fullName,
      personalInfo.fullName,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.personalInfo.walletAddress,
      personalInfo.walletAddress,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.PERSONAL_INFO,
    );
  });
  it('should update project verification with projectRegistry form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      emailConfirmed: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.PROJECT_REGISTRY,
            projectRegistry,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.projectRegistry
        .organizationDescription,
      projectRegistry.organizationDescription,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.projectRegistry
        .organizationCountry,
      projectRegistry.organizationCountry,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.PROJECT_REGISTRY,
    );
  });
  it('should update project verification with milestones form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      emailConfirmed: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.MILESTONES,
            milestones,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.milestones
        .achievedMilestones,
      milestones.achievedMilestones,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.milestones
        .achievedMilestonesProofs[0],
      milestones?.achievedMilestonesProofs?.[0],
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.milestones.foundationDate,
      milestones.foundationDate,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.MILESTONES,
    );
  });
  it('should update project verification with milestones form successfully and get it', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      emailConfirmed: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.MILESTONES,
            milestones,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.milestones
        .achievedMilestones,
      milestones.achievedMilestones,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.milestones
        .achievedMilestonesProofs[0],
      milestones?.achievedMilestonesProofs?.[0],
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.milestones.foundationDate,
      milestones.foundationDate,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.MILESTONES,
    );

    const fetchedVerificationForm = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      fetchedVerificationForm.data.data.getCurrentProjectVerificationForm
        .milestones.foundationDate,
      milestones.foundationDate,
    );
  });
  it('should update project verification with managingFunds form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      emailConfirmed: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS,
            managingFunds,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.managingFunds.description,
      managingFunds.description,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.managingFunds
        .relatedAddresses[0].address,
      managingFunds.relatedAddresses[0].address,
    );

    // Make sure that networkId would be getDefaultSolanaChainId() instead of 0
    assert.equal(
      result.data.data.updateProjectVerificationForm.managingFunds.relatedAddresses.find(
        address => address.chainType === ChainType.SOLANA,
      ).networkId,
      getDefaultSolanaChainId(),
    );

    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.MANAGING_FUNDS,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm
        .isTermAndConditionsAccepted,
      false,
    );
  });
  it('should update project verification with termAndConditions form successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      projectContacts,
      projectRegistry,
      managingFunds,
      milestones,
      emailConfirmed: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION,
            isTermAndConditionsAccepted: true,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm
        .isTermAndConditionsAccepted,
      true,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION,
    );
  });
  it('should update project verification with termAndConditions form successfully when milestones is empty', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      projectContacts,
      projectRegistry,
      managingFunds,
      emailConfirmed: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION,
            isTermAndConditionsAccepted: true,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm
        .isTermAndConditionsAccepted,
      true,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION,
    );
  });
  it('should update project verification with termAndConditions form successfully when projectContacts is empty', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      milestones,
      projectRegistry,
      managingFunds,
      emailConfirmed: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION,
            isTermAndConditionsAccepted: true,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.SUBMITTED,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm
        .isTermAndConditionsAccepted,
      true,
    );
    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.TERM_AND_CONDITION,
    );
  });

  it('should not update lastStep if filling steps that already filled', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      projectContacts,
      projectRegistry,
      managingFunds,
      milestones,
      emailConfirmed: true,
    }).save();
    projectVerification.lastStep = PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS;
    await projectVerification.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.PROJECT_REGISTRY,
            projectRegistry,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );

    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS,
    );
  });

  it('should update lastStep if filling steps that already not filled', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      emailConfirmed: true,
    }).save();
    projectVerification.lastStep = PROJECT_VERIFICATION_STEPS.PROJECT_REGISTRY;
    await projectVerification.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateProjectVerificationFormMutation,
        variables: {
          projectVerificationUpdateInput: {
            projectVerificationId: projectVerification.id,
            step: PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS,
            projectContacts,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.updateProjectVerificationForm);

    assert.equal(
      result.data.data.updateProjectVerificationForm.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );

    assert.equal(
      result.data.data.updateProjectVerificationForm.lastStep,
      PROJECT_VERIFICATION_STEPS.PROJECT_CONTACTS,
    );
  });
}

function getCurrentProjectVerificationFormTestCases() {
  it('should return verificationForm when the project is already verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.status,
      projectVerificationForm.status,
    );
  });
  it('should get current project verification form with submitted status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const socialProfileInfo = {
      projectVerificationId: projectVerificationForm.id,
      isVerified: true,
      socialNetwork: SOCIAL_NETWORKS.DISCORD,
      socialNetworkId: generateRandomString(),
    };
    await createSocialProfile(socialProfileInfo);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.status,
      projectVerificationForm.status,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.id,
      projectVerificationForm.id,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.socialProfiles.length,
      1,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.socialProfiles[0]
        .socialNetworkId,
      socialProfileInfo.socialNetworkId,
    );
  });
  it('should get current project verification form with rejected status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.REJECTED;
    await projectVerificationForm.save();
    const socialProfileInfo = {
      projectVerificationId: projectVerificationForm.id,
      isVerified: true,
      socialNetwork: SOCIAL_NETWORKS.DISCORD,
      socialNetworkId: generateRandomString(),
    };
    await createSocialProfile(socialProfileInfo);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.status,
      projectVerificationForm.status,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.id,
      projectVerificationForm.id,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.socialProfiles.length,
      1,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.socialProfiles[0]
        .socialNetworkId,
      socialProfileInfo.socialNetworkId,
    );
  });
  it('should get current project verification form with verified status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.VERIFIED;
    await projectVerificationForm.save();
    const socialProfileInfo = {
      projectVerificationId: projectVerificationForm.id,
      isVerified: true,
      socialNetwork: SOCIAL_NETWORKS.DISCORD,
      socialNetworkId: generateRandomString(),
    };
    await createSocialProfile(socialProfileInfo);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.status,
      projectVerificationForm.status,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.id,
      projectVerificationForm.id,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.socialProfiles.length,
      1,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.socialProfiles[0]
        .socialNetworkId,
      socialProfileInfo.socialNetworkId,
    );
  });
  it('should get current project verification form with draft status', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.status,
      projectVerificationForm.status,
    );
    assert.equal(
      result.data.data.getCurrentProjectVerificationForm.id,
      projectVerificationForm.id,
    );
  });
  it('should not get current project verification because unauthorized', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.SUBMITTED;
    await projectVerificationForm.save();
    const result = await axios.post(graphqlUrl, {
      query: getCurrentProjectVerificationFormQuery,
      variables: {
        slug: project.slug,
      },
    });
    assert.equal(result.data.errors[0].message, errorMessages.UN_AUTHORIZED);
  });
  it('should get current project verification because user not found', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user1.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerificationForm = await createProjectVerificationForm({
      projectId: project.id,
      userId: user1.id,
    });
    projectVerificationForm.status = PROJECT_VERIFICATION_STATUSES.DRAFT;
    await projectVerificationForm.save();
    const accessToken = await generateTestAccessToken(user2.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should get current project verification because project doesnt have project verification form', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: project.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.THERE_IS_NOT_ANY_ONGOING_PROJECT_VERIFICATION_FORM_FOR_THIS_PROJECT,
    );
  });
  it('should get current project verification because project not found', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: getCurrentProjectVerificationFormQuery,
        variables: {
          slug: new Date().toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
}

function getAllowedCountriesTestCases() {
  it('Should return list of available country list ', async () => {
    const result = await axios.post(graphqlUrl, {
      query: getAllowedCountries,
    });
    assert.equal(
      result.data.data.getAllowedCountries.length,
      countriesList.length,
    );
  });
}

function projectVerificationSendEmailConfirmationTestCases() {
  const personalInfo: PersonalInfo = {
    email: 'test@example.com',
    fullName: 'test',
    walletAddress: 'xxxxx',
  };
  it('should send email confirmation for project verification for personalInfo step', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      personalInfo,
    }).save();
    projectVerification.email = 'test email it should be over written';
    projectVerification.emailConfirmed = true;
    await projectVerification.save();

    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: projectVerificationSendEmailConfirmation,
        variables: {
          projectVerificationFormId: projectVerification.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.projectVerificationSendEmailConfirmation);
    assert.isFalse(
      result.data.data.projectVerificationSendEmailConfirmation.emailConfirmed,
    );
    assert.equal(
      result.data.data.projectVerificationSendEmailConfirmation.email,
      personalInfo.email,
    );
    assert.equal(
      result.data.data.projectVerificationSendEmailConfirmation.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.projectVerificationSendEmailConfirmation
        .emailConfirmationSent,
      true,
    );
    assert.isNotNull(
      result.data.data.projectVerificationSendEmailConfirmation
        .emailConfirmationToken,
    );
  });
  it('should throw error when sending email confirmation when email didnt change and is confirmed', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      personalInfo,
    }).save();
    projectVerification.email = personalInfo.email;
    projectVerification.emailConfirmed = true;
    await projectVerification.save();

    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: projectVerificationSendEmailConfirmation,
        variables: {
          projectVerificationFormId: projectVerification.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ALREADY_VERIFIED_THIS_EMAIL,
    );
  });
}

function projectVerificationConfirmEmailTestCases() {
  const personalInfo: PersonalInfo = {
    email: 'test@example.com',
    fullName: 'test',
    walletAddress: 'xxxxx',
  };

  it('should confirm email for project verification in personalInfo step', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      personalInfo,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const emailConfirmationSentResult = await axios.post(
      graphqlUrl,
      {
        query: projectVerificationSendEmailConfirmation,
        variables: {
          projectVerificationFormId: projectVerification.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const token =
      emailConfirmationSentResult.data.data
        .projectVerificationSendEmailConfirmation.emailConfirmationToken;

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectVerificationConfirmEmail,
        variables: {
          emailConfirmationToken: token,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.projectVerificationConfirmEmail);
    assert.equal(
      result.data.data.projectVerificationConfirmEmail.lastStep,
      PROJECT_VERIFICATION_STEPS.PERSONAL_INFO,
    );
    assert.equal(
      result.data.data.projectVerificationConfirmEmail.status,
      PROJECT_VERIFICATION_STATUSES.DRAFT,
    );
    assert.equal(
      result.data.data.projectVerificationConfirmEmail.emailConfirmed,
      true,
    );
    assert.isNotNull(
      result.data.data.projectVerificationConfirmEmail.emailConfirmedAt,
    );
  });
  it('should throw error when confirm email token invalid for project verification in personalInfo step', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.active,
      adminUserId: user.id,
      verified: false,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const projectVerification = await ProjectVerificationForm.create({
      project,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
      personalInfo,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    project;

    const token = await generateConfirmationEmailToken(projectVerification.id);
    projectVerification.emailConfirmationToken = token;
    await projectVerification.save();
    await sleep(500);

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectVerificationConfirmEmail,
        variables: {
          emailConfirmationToken: token,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'jwt expired');
    const projectVerificationReinitializedEmailParams =
      await findProjectVerificationFormById(projectVerification.id);

    assert.isFalse(projectVerificationReinitializedEmailParams!.emailConfirmed);
    assert.isFalse(
      projectVerificationReinitializedEmailParams!.emailConfirmationSent,
    );
    assert.isNotOk(
      projectVerificationReinitializedEmailParams!.emailConfirmationSentAt,
    );
    assert.isNull(
      projectVerificationReinitializedEmailParams!.emailConfirmationToken,
    );
  });
}
