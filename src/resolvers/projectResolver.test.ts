import { assert, expect } from 'chai';
import 'mocha';
import axios from 'axios';
import moment from 'moment';
import { ArgumentValidationError } from 'type-graphql';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomSolanaAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveFeaturedProjectDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import {
  activateProjectQuery,
  addProjectUpdateQuery,
  addRecipientAddressToProjectQuery,
  createProjectQuery,
  deactivateProjectQuery,
  deleteDraftProjectQuery,
  deleteProjectUpdateQuery,
  editProjectUpdateQuery,
  fetchFeaturedProjects,
  fetchFeaturedProjectUpdate,
  fetchLatestProjectUpdates,
  fetchLikedProjectsQuery,
  fetchMultiFilterAllProjectsQuery,
  fetchNewProjectsPerDate,
  fetchProjectBySlugQuery,
  fetchProjectUpdatesQuery,
  fetchSimilarProjectsBySlugQuery,
  getProjectsAcceptTokensQuery,
  getPurpleList,
  getTokensDetailsQuery,
  projectByIdQuery,
  projectsByUserIdQuery,
  updateProjectQuery,
  walletAddressIsPurpleListed,
  walletAddressIsValid,
} from '../../test/graphqlQueries';
import { CreateProjectInput, UpdateProjectInput } from './types/project-input';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import {
  Project,
  ProjectUpdate,
  ProjStatus,
  ReviewStatus,
  RevokeSteps,
} from '../entities/project';
import { Category } from '../entities/category';
import { Reaction } from '../entities/reaction';
import { ProjectStatus } from '../entities/projectStatus';
import { User } from '../entities/user';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { Token } from '../entities/token';
import { NETWORK_IDS } from '../provider';
import {
  addNewProjectAddress,
  findAllRelatedAddressByWalletAddress,
  removeRecipientAddressOfProject,
} from '../repositories/projectAddressRepository';
import {
  PROJECT_VERIFICATION_STATUSES,
  ProjectVerificationForm,
} from '../entities/projectVerificationForm';
import { MainCategory } from '../entities/mainCategory';
import { findOneProjectStatusHistoryByProjectId } from '../repositories/projectSatusHistoryRepository';
import { setPowerRound } from '../repositories/powerRoundRepository';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from '../repositories/powerBoostingRepository';
import {
  refreshProjectFuturePowerView,
  refreshProjectPowerView,
} from '../repositories/projectPowerViewRepository';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { ProjectAddress } from '../entities/projectAddress';
import { PowerBoosting } from '../entities/powerBoosting';
import { refreshUserProjectPowerView } from '../repositories/userProjectPowerViewRepository';
import { AppDataSource } from '../orm';
// We are using cache so redis needs to be cleared for tests with same filters
import {
  Campaign,
  CampaignFilterField,
  CampaignSortingField,
  CampaignType,
} from '../entities/campaign';
import { generateRandomString } from '../utils/utils';
import { FeaturedUpdate } from '../entities/featuredUpdate';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_TITLE_MAX_LENGTH,
} from '../constants/validators';
import { InstantPowerBalance } from '../entities/instantPowerBalance';
import { saveOrUpdateInstantPowerBalances } from '../repositories/instantBoostingRepository';
import { updateInstantBoosting } from '../services/instantBoostingServices';
import { addOrUpdatePowerSnapshotBalances } from '../repositories/powerBalanceSnapshotRepository';
import { findPowerSnapshots } from '../repositories/powerSnapshotRepository';
import { cacheProjectCampaigns } from '../services/campaignService';
import { ChainType } from '../types/network';
import { QfRound } from '../entities/qfRound';
import seedTokens from '../../migration/data/seedTokens';

const ARGUMENT_VALIDATION_ERROR_MESSAGE = new ArgumentValidationError([
  { property: '' },
]).message;

describe('createProject test cases --->', createProjectTestCases);
describe('updateProject test cases --->', updateProjectTestCases);
describe(
  'addRecipientAddressToProject test cases --->',
  addRecipientAddressToProjectTestCases,
);
describe('projectsByUserId test cases --->', projectsByUserIdTestCases);

describe('deactivateProject test cases --->', deactivateProjectTestCases);
describe('activateProject test cases --->', activateProjectTestCases);

describe('getProjectUpdates test cases --->', getProjectUpdatesTestCases);
describe(
  'likedProjectsByUserId test cases --->',
  likedProjectsByUserIdTestCases,
);
describe('projectBySlug test cases --->', projectBySlugTestCases);
describe('projectById test cases --->', projectByIdTestCases);
describe('getPurpleList test cases --->', getPurpleListTestCases);
describe(
  'walletAddressIsPurpleListed Test Cases --->',
  walletAddressIsPurpleListedTestCases,
);

describe('featureProjectsTestCases --->', featureProjectsTestCases);
describe('featureProjectUpdateTestCases --->', featuredProjectUpdateTestCases);

describe('walletAddressIsValid test cases --->', walletAddressIsValidTestCases);
// TODO We should implement test cases for below query/mutation
// describe('topProjects test cases --->', topProjectsTestCases);
// describe('project test cases --->', projectTestCases);
// describe('uploadImage test cases --->', uploadImageTestCases);
describe('addProjectUpdate test cases --->', addProjectUpdateTestCases);
describe('editProjectUpdate test cases --->', editProjectUpdateTestCases);
describe('deleteProjectUpdate test cases --->', deleteProjectUpdateTestCases);
// describe('getProjectsRecipients test cases --->', getProjectsRecipientsTestCases);
// describe('getProjectReactions test cases --->', getProjectReactionsTestCases);
// describe('isValidTitleForProject test cases --->', isValidTitleForProjectTestCases);
// describe('projectByAddress test cases --->', projectByAddressTestCases);
describe(
  'likedProjectsByUserId test cases --->',
  likedProjectsByUserIdTestCases,
);
describe(
  'similarProjectsBySlug test cases --->',
  similarProjectsBySlugTestCases,
);

describe('projectSearch test cases --->', projectSearchTestCases);

describe('projectUpdates query test cases --->', projectUpdatesTestCases);

describe(
  'getProjectsAcceptTokens() test cases --->',
  getProjectsAcceptTokensTestCases,
);
// We may can delete this query
// describe('updateProjectStatus test cases --->', updateProjectStatusTestCases);

// describe('activateProject test cases --->', activateProjectTestCases);

describe('projectsPerDate() test cases --->', projectsPerDateTestCases);
describe(
  'getTokensDetailsTestCases() test cases --->',
  getTokensDetailsTestCases,
);

describe('deleteDraftProject test cases --->', deleteDraftProjectTestCases);

function projectsPerDateTestCases() {
  it('should projects created in a time range', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      creationDate: moment().add(10, 'days').toDate(),
    });
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      creationDate: moment().add(44, 'days').toDate(),
    });
    const variables = {
      fromDate: moment().add(9, 'days').toDate().toISOString().split('T')[0],
      toDate: moment().add(45, 'days').toDate().toISOString().split('T')[0],
    };
    const projectsResponse = await axios.post(graphqlUrl, {
      query: fetchNewProjectsPerDate,
      variables,
    });

    assert.isOk(projectsResponse);
    assert.equal(projectsResponse.data.data.projectsPerDate.total, 2);
    const total =
      projectsResponse.data.data.projectsPerDate.totalPerMonthAndYear.reduce(
        (sum, value) => sum + value.total,
        0,
      );
    assert.equal(projectsResponse.data.data.projectsPerDate.total, total);
  });
}

function getProjectsAcceptTokensTestCases() {
  // These test cases run successfully when we just run them alone but when we run all test cases together
  // they fail because of changing DB during other test cases
  it.skip('should return all tokens for giveth projects', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const allTokens = await Token.find({});
    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isOk(result.data.data.getProjectAcceptTokens);
    assert.equal(
      result.data.data.getProjectAcceptTokens.length,
      allTokens.length,
    );
  });
  it.skip('should return all tokens for trace projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const traceOrganization = (await Organization.findOne({
      where: {
        label: ORGANIZATION_LABELS.TRACE,
      },
    })) as Organization;

    const allTokens = (
      await Token.query(`
          SELECT COUNT(*) as "tokenCount"
          FROM organization_tokens_token
          WHERE "organizationId" = ${traceOrganization.id}
      `)
    )[0];
    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isOk(result.data.data.getProjectAcceptTokens);
    assert.equal(
      result.data.data.getProjectAcceptTokens.length,
      Number(allTokens.tokenCount),
    );
  });

  it('should return just Gnosis tokens when project just have Gnosis recipient address', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
      networkId: NETWORK_IDS.XDAI,
    });

    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isNotEmpty(result.data.data.getProjectAcceptTokens);
    result.data.data.getProjectAcceptTokens.forEach(token => {
      assert.equal(token.networkId, NETWORK_IDS.XDAI);
    });
  });
  it('should return just Ropsten tokens when project just have Ropsten recipient address', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
      networkId: NETWORK_IDS.ROPSTEN,
    });

    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isNotEmpty(result.data.data.getProjectAcceptTokens);
    result.data.data.getProjectAcceptTokens.forEach(token => {
      assert.equal(token.networkId, NETWORK_IDS.ROPSTEN);
    });
  });
  it('should return just Solana and Ropsten tokens when project just have Solana and Ropsten recipient address', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
      networkId: NETWORK_IDS.ROPSTEN,
    });

    await addNewProjectAddress({
      project,
      user: project.adminUser,
      isRecipient: true,
      networkId: NETWORK_IDS.SOLANA_MAINNET,
      address: generateRandomSolanaAddress(),
      chainType: ChainType.SOLANA,
    });

    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isNotEmpty(result.data.data.getProjectAcceptTokens);
    result.data.data.getProjectAcceptTokens.forEach(token => {
      expect(token.networkId).to.satisfy(
        networkId =>
          networkId === NETWORK_IDS.SOLANA_MAINNET ||
          networkId === NETWORK_IDS.ROPSTEN,
      );
    });
  });
  it('should no tokens when there is not any recipient address', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
      networkId: NETWORK_IDS.ROPSTEN,
    });
    await removeRecipientAddressOfProject({ project });

    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isEmpty(result.data.data.getProjectAcceptTokens);
  });
}

function projectsByUserIdTestCases() {
  it('should return projects with verificationForm if userId is same as logged in user', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      adminUserId: user.id,
    });

    const verificationForm = await ProjectVerificationForm.create({
      project: project1,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
    }).save();

    const accessToken = await generateTestAccessToken(user!.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectsByUserIdQuery,
        variables: {
          userId: user!.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const projects = result.data.data.projectsByUserId.projects;
    const projectWithAnotherOwner = projects.find(
      project => project.adminUserId !== user!.id,
    );
    assert.isNotOk(projectWithAnotherOwner);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isOk(project.projectVerificationForm);
      assert.equal(project.projectVerificationForm.id, verificationForm.id);
      assert.isNotOk(project.adminUser.email);
      assert.equal(project.organization.label, ORGANIZATION_LABELS.GIVETH);
    });
  });

  it('should return projects with specific admin', async () => {
    const userId = SEED_DATA.FIRST_USER.id;
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    const projectWithAnotherOwner = projects.find(
      project => project.adminUserId !== userId,
    );
    assert.isNotOk(projectWithAnotherOwner);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNull(project.projectVerificationForm);
      assert.isNotOk(project.adminUser.email);
    });
  });

  it('should return projects with current take', async () => {
    const take = 1;
    const userId = SEED_DATA.FIRST_USER.id;
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        take,
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.equal(projects.length, take);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
    });
  });

  it('should return projects with qfRound', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData(), user);
    const qfRound = QfRound.create({
      isActive: false,
      name: generateRandomString(10),
      slug: generateRandomString(10),
      allocatedFund: 100,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    project.qfRounds = [qfRound];
    await project.save();
    const accessToken = await generateTestAccessToken(user!.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectsByUserIdQuery,
        variables: {
          userId: user.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // We have created user just in this test case so this will have only one project
    const fetchedProject = result.data.data.projectsByUserId.projects[0];
    assert.equal(fetchedProject.qfRounds[0].id, qfRound.id);
  });

  it('should not return draft projects', async () => {
    const take = 1;
    const userId = SEED_DATA.FIRST_USER.id;
    const draftProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: SEED_DATA.FIRST_USER.id,
      statusId: ProjStatus.drafted,
    });
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        take,
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.equal(projects.length, take);
    assert.isNotOk(projects.find(project => project.id === draftProject.id));
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
    });
  });

  it('should not return not listed projects', async () => {
    const userId = SEED_DATA.FIRST_USER.id;
    const notListedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: SEED_DATA.FIRST_USER.id,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.isNotOk(
      projects.find(project => project.id === notListedProject.id),
    );
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
    });
  });

  it('should not return new created active project', async () => {
    const userId = SEED_DATA.FIRST_USER.id;
    const activeProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const result = await axios.post(graphqlUrl, {
      query: projectsByUserIdQuery,
      variables: {
        userId,
      },
    });
    const projects = result.data.data.projectsByUserId.projects;
    assert.equal(projects[0].id, activeProject.id);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
    });
    assert.isNotEmpty(result.data.data.projectsByUserId.projects[0].addresses);
  });
}

function createProjectTestCases() {
  it('should not create projects with same slug and title', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const sampleProject1 = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const sampleProject2 = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const res1 = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const res2 = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject2,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const isRes1Ok = !!res1.data.data?.createProject;
    const isRes2Ok = !!res2.data.data?.createProject;
    assert.isTrue(isRes1Ok);
    assert.isFalse(isRes2Ok);
  });
  it('Create Project should return <<Access denied>>, calling without token IN ENGLISH when no-lang header is sent', async () => {
    const sampleProject = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {},
    );

    assert.equal(result.status, 200);
    // default is english so it will match
    assert.equal(
      result.data.errors[0].message,
      i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
    );
  });
  it('Create Project should return <<Access denied>>, calling without token IN ENGLISH when non supported language is sent', async () => {
    const sampleProject = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          'accept-language': 'br',
        },
      },
    );

    assert.equal(result.status, 200);
    // default is english so it will match
    assert.equal(
      result.data.errors[0].message,
      i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
    );
  });
  it('Create Project should return <<Access denied>>, calling without token IN SPANISH', async () => {
    const sampleProject = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          'accept-language': 'es',
        },
      },
    );
    i18n.setLocale('es'); // for the test translation scope
    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      i18n.__(translationErrorMessagesKeys.AUTHENTICATION_REQUIRED),
    );
  });
  it('Create Project should return <<Access denied>>, calling without token', async () => {
    const sampleProject = {
      title: 'title1',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          'accept-language': 'en',
        },
      },
    );

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error, invalid category', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: ['invalid category'],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
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
      errorMessages.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
    );
  });
  it('Should get error, when selected category is not active', async () => {
    const mainCategory = await MainCategory.findOne({ where: {} });
    const nonActiveCategory = await Category.create({
      name: 'nonActiveCategory',
      value: 'nonActiveCategory',
      isActive: false,
      source: 'adhoc',
      mainCategory: mainCategory as MainCategory,
    }).save();
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [nonActiveCategory.name],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
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
      errorMessages.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
    );
  });
  it('Should get error, when selected category canUseOnFrontend is false', async () => {
    const mainCategory = await MainCategory.findOne({ where: {} });
    const nonActiveCategory = await Category.create({
      name: new Date().toISOString(),
      value: new Date().toISOString(),
      isActive: true,
      canUseOnFrontend: false,
      source: 'adhoc',
      mainCategory: mainCategory as MainCategory,
    }).save();
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [nonActiveCategory.name],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
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
      errorMessages.CATEGORIES_MUST_BE_FROM_THE_FRONTEND_SUBSELECTION,
    );
  });
  it('Should get error, when more than 5 categories sent', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: SEED_DATA.FOOD_SUB_CATEGORIES,
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
          chainType: ChainType.EVM,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
          chainType: ChainType.EVM,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
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
      errorMessages.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
    );
  });
  it('Should not get error, when sending one recipient address', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [
        SEED_DATA.FOOD_SUB_CATEGORIES[0],
        SEED_DATA.FOOD_SUB_CATEGORIES[1],
      ],
      description: '<div>Sample Project Creation</div>',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(result.data.data.createProject);
    assert.equal(
      result.data.data.createProject.descriptionSummary,
      'Sample Project Creation',
    );
  });
  it('Should not get error, when sending more thant two recipient address', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [
        SEED_DATA.FOOD_SUB_CATEGORIES[0],
        SEED_DATA.FOOD_SUB_CATEGORIES[1],
      ],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.BSC,
        },
        {
          address: generateRandomSolanaAddress(),
          networkId: 0,
          chainType: ChainType.SOLANA,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result.data.data.createProject);
  });
  it('Should get error, when address is not valid value - Ethereum', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: SEED_DATA.MALFORMED_ETHEREUM_ADDRESS,
          networkId: NETWORK_IDS.XDAI,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject },
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
      errorMessages.INVALID_WALLET_ADDRESS,
    );
  });
  it('Should get error, when address is not valid value - Solana', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: SEED_DATA.MALFORMED_SOLANA_ADDRESS,
          networkId: 0,
          chainType: ChainType.SOLANA,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject },
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
      errorMessages.INVALID_WALLET_ADDRESS,
    );
  });
  it('Should get error, when walletAddress of project is repetitive', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: SEED_DATA.FIRST_PROJECT.walletAddress,
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: SEED_DATA.FIRST_PROJECT.walletAddress,
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject, title: String(new Date().getTime()) },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      addProjectResponse.data.errors[0].message,
      `Address ${SEED_DATA.FIRST_PROJECT.walletAddress} is already being used for a project`,
    );
  });
  it('should create project when walletAddress of project is a smart contract address', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: SEED_DATA.DAI_SMART_CONTRACT_ADDRESS,
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: SEED_DATA.DAI_SMART_CONTRACT_ADDRESS,
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: { ...sampleProject },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(addProjectResponse.data.data.createProject);
    assert.equal(
      addProjectResponse.data.data.createProject.title,
      sampleProject.title,
    );
  });
  it('Should get error, when title of project is repetitive', async () => {
    const sampleProject: CreateProjectInput = {
      title: SEED_DATA.FIRST_PROJECT.title,
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const addProjectResponse = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: {
            ...sampleProject,
            addresses: [
              {
                address: generateRandomEtheriumAddress(),
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: generateRandomEtheriumAddress(),
                networkId: NETWORK_IDS.MAIN_NET,
              },
            ],
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      addProjectResponse.data.errors[0].message,
      errorMessages.PROJECT_WITH_THIS_TITLE_EXISTS,
    );
  });

  it('Should get error on too long description and title', async () => {
    const sampleProject: CreateProjectInput = {
      title: 'title ' + new Date().getTime(),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      // Too long description
      description: 'a'.repeat(PROJECT_DESCRIPTION_MAX_LENGTH + 1),
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    let result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
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
      ARGUMENT_VALIDATION_ERROR_MESSAGE,
    );

    // too long title
    sampleProject.title = 'a'.repeat(PROJECT_TITLE_MAX_LENGTH + 1);
    sampleProject.description = 'description';
    result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
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
      ARGUMENT_VALIDATION_ERROR_MESSAGE,
    );
  });

  it('Should create successfully', async () => {
    const sampleProject: CreateProjectInput = {
      title: 'title ' + new Date().getTime(),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.exists(result.data);
    assert.exists(result.data.data);
    assert.exists(result.data.data.createProject);
    assert.equal(result.data.data.createProject.title, sampleProject.title);
    assert.equal(
      result.data.data.createProject.organization.label,
      ORGANIZATION_LABELS.GIVETH,
    );

    // When creating project, listed is null by default
    assert.equal(result.data.data.createProject.listed, null);
    assert.equal(
      result.data.data.createProject.reviewStatus,
      ReviewStatus.NotReviewed,
    );

    assert.equal(
      result.data.data.createProject.adminUser.id,
      SEED_DATA.FIRST_USER.id,
    );
    assert.equal(result.data.data.createProject.verified, false);
    assert.equal(
      result.data.data.createProject.status.id,
      String(ProjStatus.active),
    );
    assert.equal(
      result.data.data.createProject.description,
      sampleProject.description,
    );

    assert.equal(
      result.data.data.createProject.adminUser.walletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    assert.equal(result.data.data.createProject.image, sampleProject.image);
    assert.equal(
      result.data.data.createProject.creationDate,
      result.data.data.createProject.updatedAt,
    );
    assert.equal(result.data.data.createProject.addresses.length, 2);
    assert.equal(
      result.data.data.createProject.addresses[0].address,
      sampleProject.addresses[0].address,
    );
    assert.equal(
      result.data.data.createProject.addresses[0].chainType,
      ChainType.EVM,
    );
  });
  it('Should create successfully with special characters in title', async () => {
    const titleWithoutSpecialCharacters = 'title-_' + new Date().getTime();
    const sampleProject: CreateProjectInput = {
      title: titleWithoutSpecialCharacters + `?!@#$%^&*+=.|/<">'` + '`',
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.exists(result.data);
    assert.exists(result.data.data);
    assert.exists(result.data.data.createProject);
    assert.equal(result.data.data.createProject.title, sampleProject.title);
    assert.equal(
      result.data.data.createProject.slug,
      titleWithoutSpecialCharacters,
    );
  });

  it('Should create draft successfully', async () => {
    const sampleProject: CreateProjectInput = {
      title: 'draftTitle1 ' + new Date().getTime(),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      isDraft: true,
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.exists(result.data);
    assert.exists(result.data.data);
    assert.exists(result.data.data.createProject);
    assert.equal(result.data.data.createProject.title, sampleProject.title);
    assert.equal(
      result.data.data.createProject.organization.label,
      ORGANIZATION_LABELS.GIVETH,
    );

    // When creating project, listed is null by default
    assert.equal(result.data.data.createProject.listed, null);
    assert.equal(
      result.data.data.createProject.reviewStatus,
      ReviewStatus.NotReviewed,
    );

    assert.equal(
      result.data.data.createProject.adminUserId,
      SEED_DATA.FIRST_USER.id,
    );
    assert.equal(result.data.data.createProject.verified, false);
    assert.equal(
      result.data.data.createProject.status.id,
      String(ProjStatus.drafted),
    );
    assert.equal(
      result.data.data.createProject.description,
      sampleProject.description,
    );
  });
}

function updateProjectTestCases() {
  it('Update Project should return <<Access denied>>, calling without token', async () => {
    const result = await axios.post(graphqlUrl, {
      query: updateProjectQuery,
      variables: {
        projectId: 1,
        newProjectData: {
          title: String(new Date().getTime()),
        },
      },
    });

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error when updating someone else project', async () => {
    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('updateProject Should get error when project not found', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          // A number that we can be sure there is not a project with this id
          projectId: 1_000_000,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      editProjectResult.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('Should get error when sending more than 5 categories', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            title: String(new Date().getTime()),
            categories: SEED_DATA.FOOD_SUB_CATEGORIES,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,

      errorMessages.CATEGORIES_LENGTH_SHOULD_NOT_BE_MORE_THAN_FIVE,
    );
  });
  it('Should get error when sent walletAddress is repetitive', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            addresses: [
              {
                address: SEED_DATA.SECOND_PROJECT.walletAddress,
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: SEED_DATA.SECOND_PROJECT.walletAddress,
                networkId: NETWORK_IDS.MAIN_NET,
              },
            ],
            title: SEED_DATA.FIRST_PROJECT.title,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,
      `Address ${SEED_DATA.SECOND_PROJECT.walletAddress} is already being used for a project`,
    );
  });
  it('Should update project when sent walletAddress is smartContractAddress', async () => {
    await ProjectAddress.createQueryBuilder()
      .delete()
      .from(ProjectAddress)
      .where('address = :address', {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      })
      .execute();
    await Project.createQueryBuilder()
      .delete()
      .from(Project)
      .where('walletAddress = :address', {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      })
      .execute();

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            addresses: [
              {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: '0x6b175474e89094c44da98b954eedeac495271d0f',
                networkId: NETWORK_IDS.MAIN_NET,
              },
            ],
            title: 'NewTestTitle',
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(editProjectResult.data.data.updateProject);
    assert.equal(
      editProjectResult.data.data.updateProject.title,
      'NewTestTitle',
    );
    const walletaddressOfUpdateProject =
      await ProjectAddress.createQueryBuilder()
        .where('"projectId" = :projectId', {
          projectId: Number(editProjectResult.data.data.updateProject.id),
        })
        .getOne();
    assert.isOk(
      walletaddressOfUpdateProject!.address,
      SEED_DATA.DAI_SMART_CONTRACT_ADDRESS,
    );
  });
  it('Should get error on too long description and title', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();

    const newProjectData = {
      addresses: [
        {
          address: newWalletAddress,
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: newWalletAddress,
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
      title: `test title update addresses`,
      // Too long description
      description: 'a'.repeat(PROJECT_DESCRIPTION_MAX_LENGTH + 1),
    };

    let editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      editProjectResult.data.errors[0].message,
      ARGUMENT_VALIDATION_ERROR_MESSAGE,
    );

    // Too long title
    newProjectData.description = 'description';
    newProjectData.title = 'a'.repeat(PROJECT_TITLE_MAX_LENGTH + 1);

    editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      editProjectResult.data.errors[0].message,
      ARGUMENT_VALIDATION_ERROR_MESSAGE,
    );
  });

  it('Should update addresses successfully - Ethereum', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            addresses: [
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.MAIN_NET,
              },
            ],
            title: `test title update addresses` + new Date().getTime(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const { updateProject } = editProjectResult.data.data;
    assert.isOk(updateProject);

    const { addresses } = updateProject;
    assert.lengthOf(addresses, 2);
    addresses.forEach(address => {
      assert.equal(address.address, newWalletAddress);
      assert.equal(address.chainType, ChainType.EVM);
    });
  });
  it('Should update addresses successfully - Solana', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const ethAddress = generateRandomEtheriumAddress();
    const solanaAddress = generateRandomSolanaAddress();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            addresses: [
              {
                address: ethAddress,
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: solanaAddress,
                networkId: 0,
                chainType: ChainType.SOLANA,
              },
            ],
            title: `test title update addresses` + new Date().getTime(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const { updateProject } = editProjectResult.data.data;
    assert.isOk(updateProject);

    const { addresses } = updateProject;
    assert.lengthOf(addresses, 2);
    assert.ok(
      addresses.some(
        address =>
          address.chainType === ChainType.EVM &&
          address.address === ethAddress.toLocaleLowerCase(),
      ),
    );
    assert.ok(
      addresses.some(
        address =>
          address.chainType === ChainType.SOLANA &&
          address.address === solanaAddress,
      ),
    );
  });
  it('Should update addresses with two addresses successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();
    const newWalletAddress2 = generateRandomEtheriumAddress();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            addresses: [
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: newWalletAddress2,
                networkId: NETWORK_IDS.MAIN_NET,
              },
            ],
            title: `test title update addresses with two addresses`,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // assert.equal(JSON.stringify(editProjectResult.data, null, 4), 'hi');
    assert.isOk(editProjectResult.data.data.updateProject);
    assert.equal(editProjectResult.data.data.updateProject.addresses.length, 2);
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[0].address,
      newWalletAddress,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[0].networkId,
      NETWORK_IDS.XDAI,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[0].chainType,
      ChainType.EVM,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[1].address,
      newWalletAddress2,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[1].networkId,
      NETWORK_IDS.MAIN_NET,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[1].chainType,
      ChainType.EVM,
    );
  });
  it('Should update addresses with current addresses successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const walletAddress = generateRandomEtheriumAddress();

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      walletAddress,
    });
    const newWalletAddress = project.walletAddress;

    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            addresses: [
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.MAIN_NET,
              },
            ],
            title: `test title update addresses with current addresses`,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // assert.equal(JSON.stringify(editProjectResult.data, null, 4), 'hi');
    assert.isOk(editProjectResult.data.data.updateProject);
    assert.equal(editProjectResult.data.data.updateProject.addresses.length, 2);
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[0].address,
      newWalletAddress,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[0].networkId,
      NETWORK_IDS.XDAI,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[1].address,
      newWalletAddress,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[1].networkId,
      NETWORK_IDS.MAIN_NET,
    );
    const queriedAddress = await findAllRelatedAddressByWalletAddress(
      newWalletAddress as string,
    );
    assert.equal(queriedAddress.length, 2);
  });
  it('Should not throw error when sending one address', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            addresses: [
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.XDAI,
              },
            ],
            title: `test title should not throw error when sending one address`,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(editProjectResult.data.data.updateProject);
  });
  it('Should not throw error when sending three address', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            addresses: [
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.MAIN_NET,
              },
              {
                address: newWalletAddress,
                networkId: NETWORK_IDS.BSC,
              },
            ],
            title: `test title should throw error when sending three address`,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(editProjectResult.data.data.updateProject);
  });
  it('Should get error when sent title is repetitive', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          newProjectData: {
            title: SEED_DATA.SECOND_PROJECT.title,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      editProjectResult.data.errors[0].message,
      errorMessages.PROJECT_WITH_THIS_TITLE_EXISTS,
    );
  });
  it('Should update successfully when updating with old title', async () => {
    const sampleProject: UpdateProjectInput = {
      title: 'test ' + String(new Date().getTime()),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const createProjectResult = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const newTitle = sampleProject.title.toUpperCase();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(createProjectResult.data.data.createProject.id),
          newProjectData: {
            title: newTitle,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.title, newTitle);
    assert.equal(
      editProjectResult.data.data.updateProject.adminUser.walletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
  });
  it('Should update successfully and slugHistory would contain last slug', async () => {
    const title = 'test 123456';
    const slug = 'test-123456';
    const sampleProject: UpdateProjectInput = {
      title,
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.XDAI,
        },
        {
          address: generateRandomEtheriumAddress(),
          networkId: NETWORK_IDS.MAIN_NET,
        },
      ],
    };
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const createProjectResult = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const newTitle = `test` + new Date().getTime().toString();
    const newSlug = newTitle;
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: Number(createProjectResult.data.data.createProject.id),
          newProjectData: {
            title: newTitle,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.title, newTitle);
    assert.equal(editProjectResult.data.data.updateProject.slug, newSlug);
    assert.isTrue(
      editProjectResult.data.data.updateProject.slugHistory.includes(slug),
    );
  });
  it('Should update successfully when sending current walletAddress', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const walletAddress = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      walletAddress,
    });

    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
            addresses: [
              {
                address: walletAddress,
                networkId: NETWORK_IDS.XDAI,
              },
              {
                address: walletAddress,
                networkId: NETWORK_IDS.MAIN_NET,
              },
            ],
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(editProjectResult.data.data.updateProject);
  });
  it('Should update successfully and verified(true) field would not change', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: true,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isTrue(editProjectResult.data.data.updateProject.verified);
  });
  it('Should update successfully and verified(false) field would not change', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isFalse(editProjectResult.data.data.updateProject.verified);
  });
  it('Should update successfully listed (true) should becomes null', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.listed, null);
    assert.equal(
      editProjectResult.data.data.updateProject.reviewStatus,
      ReviewStatus.NotReviewed,
    );
  });
  it('Should update successfully listed (false) should becomes null', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: String(new Date().getTime()),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.listed, null);
    assert.equal(
      editProjectResult.data.data.updateProject.reviewStatus,
      ReviewStatus.NotReviewed,
    );
  });
  it('Should update image successfully', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb(createProjectData());
    const image =
      'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS';
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            image,
            title: new Date().getTime().toString(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
  });
  it('Should update image successfully when sending empty string', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
    });
    const image = '';
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            image,
            title: new Date().getTime().toString(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
  });
  it('Should change updatedAt when updating project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: new Date().getTime().toString(),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(editProjectResult.data.data.updateProject);
    assert.notEqual(
      editProjectResult.data.data.updateProject.updatedAt,
      project.updatedAt,
    );
  });
  it('Should not update image when not sending it', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const image =
      'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS';
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      image,
    });
    const newTitle = new Date().getTime().toString();
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: newTitle,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
  });
  it('Should not change slug when updating description', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const image =
      'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS';
    const title = new Date().getTime().toString();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      image,
      title,
    });
    const newDescription = 'test description haahaaa';
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            description: newDescription,
            title,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
    assert.equal(editProjectResult.data.data.updateProject.title, title);
    assert.equal(editProjectResult.data.data.updateProject.slug, title);
    assert.equal(
      editProjectResult.data.data.updateProject.description,
      newDescription,
    );
  });
  it('Should change slug when updating title', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const image =
      'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS';
    const title = new Date().getTime().toString();
    const newTitle = `${title}new`;
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      image,
      title,
    });
    const editProjectResult = await axios.post(
      graphqlUrl,
      {
        query: updateProjectQuery,
        variables: {
          projectId: project.id,
          newProjectData: {
            title: newTitle,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(editProjectResult.data.data.updateProject.image, image);
    assert.equal(editProjectResult.data.data.updateProject.title, newTitle);
    assert.equal(editProjectResult.data.data.updateProject.slug, newTitle);
    assert.isTrue(
      editProjectResult.data.data.updateProject.slugHistory.includes(title),
    );
  });
}

function addRecipientAddressToProjectTestCases() {
  it('addRecipientAddressToProject should return <<Access denied>>, calling without token', async () => {
    const result = await axios.post(graphqlUrl, {
      query: addRecipientAddressToProjectQuery,
      variables: {
        projectId: 1,
        networkId: NETWORK_IDS.POLYGON,
        address: generateRandomEtheriumAddress(),
      },
    });

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error when updating someone else project', async () => {
    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          networkId: NETWORK_IDS.POLYGON,
          address: generateRandomEtheriumAddress(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );
    assert.equal(
      response.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('addRecipientAddressToProject Should get error when project not found', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          // A number that we can be sure there is not a project with this id
          projectId: 1_000_000,
          networkId: NETWORK_IDS.POLYGON,
          address: generateRandomEtheriumAddress(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      response.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('Should get error when sent walletAddress is repetitive', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: Number(SEED_DATA.FIRST_PROJECT.id),
          networkId: NETWORK_IDS.POLYGON,
          address: SEED_DATA.SECOND_PROJECT.walletAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      response.data.errors[0].message,
      `Address ${SEED_DATA.SECOND_PROJECT.walletAddress} is already being used for a project`,
    );
  });
  it('Should update project when sent walletAddress is smartContractAddress', async () => {
    await ProjectAddress.createQueryBuilder()
      .delete()
      .from(ProjectAddress)
      .where('address = :address', {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      })
      .execute();
    await Project.createQueryBuilder()
      .delete()
      .from(Project)
      .where('walletAddress = :address', {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      })
      .execute();

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.POLYGON,
          address: generateRandomEtheriumAddress(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(response.data.data.addRecipientAddressToProject);

    const walletaddressOfUpdateProject =
      await ProjectAddress.createQueryBuilder()
        .where('"projectId" = :projectId', {
          projectId: Number(response.data.data.addRecipientAddressToProject.id),
        })
        .getMany();
    assert.isOk(
      walletaddressOfUpdateProject[1]?.address,
      SEED_DATA.DAI_SMART_CONTRACT_ADDRESS,
    );
  });
  it('Should add address successfully - EVM', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();

    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.POLYGON,
          address: newWalletAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // assert.equal(JSON.stringify(response.data, null, 4), 'hi');
    assert.isOk(response.data.data.addRecipientAddressToProject);
    assert.isOk(
      response.data.data.addRecipientAddressToProject.addresses.find(
        projectAddress =>
          projectAddress.address === newWalletAddress &&
          projectAddress.chainType === ChainType.EVM,
      ),
    );
  });

  it('Should add address successfully - EVM', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomSolanaAddress();

    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: project.id,
          networkId: 0,
          address: newWalletAddress,
          chainType: ChainType.SOLANA,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // assert.equal(JSON.stringify(response.data, null, 4), 'hi');
    assert.isOk(response.data.data.addRecipientAddressToProject);
    assert.isOk(
      response.data.data.addRecipientAddressToProject.addresses.find(
        projectAddress =>
          projectAddress.address === newWalletAddress &&
          projectAddress.chainType === ChainType.SOLANA,
      ),
    );
  });

  it('Should add CELO address successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();

    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.CELO,
          address: newWalletAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // assert.equal(JSON.stringify(response.data, null, 4), 'hi');
    assert.isOk(response.data.data.addRecipientAddressToProject);
    assert.isOk(
      response.data.data.addRecipientAddressToProject.addresses.find(
        projectAddress => projectAddress.address === newWalletAddress,
      ),
    );
  });

  it('Should add Arbitrum address successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();

    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.ARBITRUM_MAINNET,
          address: newWalletAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // assert.equal(JSON.stringify(response.data, null, 4), 'hi');
    assert.isOk(response.data.data.addRecipientAddressToProject);
    assert.isOk(
      response.data.data.addRecipientAddressToProject.addresses.find(
        projectAddress => projectAddress.address === newWalletAddress,
      ),
    );
  });

  it('Should update successfully listed (true) should not change', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const newWalletAddress = generateRandomEtheriumAddress();

    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.POLYGON,
          address: newWalletAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // assert.equal(JSON.stringify(response.data, null, 4), 'hi');
    assert.isOk(response.data.data.addRecipientAddressToProject);
    assert.isOk(
      response.data.data.addRecipientAddressToProject.addresses.find(
        projectAddress => projectAddress.address === newWalletAddress,
      ),
    );

    assert.equal(response.data.data.addRecipientAddressToProject.listed, true);
    assert.equal(
      response.data.data.addRecipientAddressToProject.reviewStatus,
      ReviewStatus.Listed,
    );
  });
  it('Should update successfully listed (false) should should not change', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const newWalletAddress = generateRandomEtheriumAddress();

    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.POLYGON,
          address: newWalletAddress,
          chainType: ChainType.EVM,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // assert.equal(JSON.stringify(response.data, null, 4), 'hi');
    assert.isOk(response.data.data.addRecipientAddressToProject);
    assert.isOk(
      response.data.data.addRecipientAddressToProject.addresses.find(
        projectAddress => projectAddress.address === newWalletAddress,
      ),
    );
    assert.equal(response.data.data.addRecipientAddressToProject.listed, false);
    assert.equal(
      response.data.data.addRecipientAddressToProject.reviewStatus,
      ReviewStatus.NotListed,
    );
  });

  it('Should not change updatedAt when updating project', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const newWalletAddress = generateRandomEtheriumAddress();

    const response = await axios.post(
      graphqlUrl,
      {
        query: addRecipientAddressToProjectQuery,
        variables: {
          projectId: project.id,
          networkId: NETWORK_IDS.POLYGON,
          address: newWalletAddress,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    // assert.equal(JSON.stringify(response.data, null, 4), 'hi');
    assert.isOk(response.data.data.addRecipientAddressToProject);
    assert.equal(
      response.data.data.addRecipientAddressToProject.updatedAt,
      project.updatedAt.toISOString(),
    );
  });
}

function deactivateProjectTestCases() {
  it('Deactivate Project should return <<Access denied>>, calling without token', async () => {
    const result = await axios.post(graphqlUrl, {
      query: deactivateProjectQuery,
      variables: {
        projectId: 1,
      },
    });

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error when deactivating someone else project', async () => {
    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );
    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT,
    );
  });
  it('Deactivate Project Should get error when project not found', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: 1_000_000,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });

  it('Should get error when deactivating cancelled/deactivated project', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactiveStatus = await ProjectStatus.findOne({
      where: {
        id: ProjStatus.cancelled,
      },
    });
    project.status = deactiveStatus as ProjectStatus;
    await project.save();
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY,
    );
  });

  it('Should deactivate project successfully', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
  });

  it('Should deactivate project successfully and create projectStatusHistory', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
          reasonId: 1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    const projectStatusHistory = await findOneProjectStatusHistoryByProjectId(
      project.id,
    );
    assert.isOk(projectStatusHistory);
    assert.equal(projectStatusHistory?.reasonId, 1);
  });
  it('Should deactivate project successfully and create projectStatusHistory without reasonId', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    const projectStatusHistory = await findOneProjectStatusHistoryByProjectId(
      project.id,
    );
    assert.isOk(projectStatusHistory);
    assert.isNotOk(projectStatusHistory?.reasonId);
  });

  it('Should deactivate project successfully, will affect listed to (false)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
    assert.isFalse(updatedProject?.listed);
  });

  it('Should deactivate project successfully, wont affect listed(false)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    assert.isFalse(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotListed);
  });

  it('Should deactivate project successfully, wont affect verified(true)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: true,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    assert.isTrue(updatedProject?.verified);
  });

  it('Should deactivate project successfully, wont affect verified(false)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: deactivateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.deactivateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.deactive);
    assert.isFalse(updatedProject?.verified);
  });
}

function activateProjectTestCases() {
  it('Activate Project should return <<Access denied>>, calling without token', async () => {
    const result = await axios.post(graphqlUrl, {
      query: activateProjectQuery,
      variables: {
        projectId: 1,
      },
    });

    assert.equal(result.status, 200);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('Should get error when activating someone else project', async () => {
    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );
    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_DEACTIVATE_THIS_PROJECT,
    );
  });
  it('Activate Project Should get error when project not found', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: 1_000_000,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });

  it('Should get error when Activating cancelled project', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    const deactiveStatus = await ProjectStatus.findOne({
      where: {
        id: ProjStatus.cancelled,
      },
    });
    project.status = deactiveStatus as ProjectStatus;
    await project.save();
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(
      deactivateProjectResult.data.errors[0].message,
      errorMessages.THIS_PROJECT_IS_CANCELLED_OR_DEACTIVATED_ALREADY,
    );
  });

  it('Should activate project successfully', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
  });

  it('Should activate draft project successfully', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.drafted,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
  });

  it('Should activate project successfully and create projectStatusHistory', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
    });
    const deactivateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(deactivateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    const projectStatusHistory = await findOneProjectStatusHistoryByProjectId(
      project.id,
    );
    assert.isOk(projectStatusHistory);
    assert.isNotOk(projectStatusHistory?.reasonId);
  });

  it('Should activate project successfully,  should change listed from true to null', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      listed: true,
      reviewStatus: ReviewStatus.Listed,
    });

    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    assert.isNull(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotReviewed);
  });

  it('Should activate project successfully,  should change listed from false to null', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
      statusId: ProjStatus.deactive,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    assert.isNull(updatedProject?.listed);
    assert.equal(updatedProject?.reviewStatus, ReviewStatus.NotReviewed);
  });

  it('Should activate project successfully, wont affect verified(true)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: true,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    assert.isTrue(updatedProject?.verified);
  });

  it('Should activate project successfully, wont affect verified(false)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });
    const activateProjectResult = await axios.post(
      graphqlUrl,
      {
        query: activateProjectQuery,
        variables: {
          projectId: Number(project.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(activateProjectResult.data.data.activateProject, true);
    const updatedProject = await Project.findOne({
      where: {
        id: project.id,
      },
    });
    assert.equal(updatedProject?.statusId, ProjStatus.active);
    assert.isFalse(updatedProject?.verified);
  });
}

function likedProjectsByUserIdTestCases() {
  it('should returns projects liked by the user', async () => {
    const take = 1;
    const result = await axios.post(graphqlUrl, {
      query: fetchLikedProjectsQuery,
      variables: {
        userId: SEED_DATA.FIRST_USER.id,
        take,
      },
    });

    const projects = result.data.data.likedProjectsByUserId.projects;
    assert.equal(projects.length, take);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
      assert.equal(project.organization.label, ORGANIZATION_LABELS.GIVETH);
    });
    const reaction = await Reaction.findOne({
      where: {
        userId: SEED_DATA.FIRST_USER.id,
        projectId: SEED_DATA.FIRST_PROJECT.id,
      },
    });

    assert.equal(projects[0].id, reaction?.projectId);
    assert.equal(projects[0]?.reaction?.id, reaction?.id);
  });
  describe('if the user did not like any project', () => {
    it('should return an empty list', async () => {
      const result = await axios.post(graphqlUrl, {
        query: fetchLikedProjectsQuery,
        variables: {
          userId: SEED_DATA.SECOND_USER.id,
        },
      });

      const projects = result.data.data.likedProjectsByUserId.projects;
      assert.equal(projects.length, 0);
    });
  });
}

function walletAddressIsValidTestCases() {
  it('should return true for new ethereum address', async () => {
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: generateRandomEtheriumAddress(),
      },
    });
    assert.equal(result.data.data.walletAddressIsValid, true);
  });

  it('should throw error for invalid ethereum address', async () => {
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: '4297urofklshnforp2',
      },
    });
    assert.equal(
      result.data.errors[0].message,
      errorMessages.INVALID_WALLET_ADDRESS,
    );
  });

  it('should throw error for existing walletAddress', async () => {
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: SEED_DATA.FIRST_PROJECT.walletAddress,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      `Address ${SEED_DATA.FIRST_PROJECT.walletAddress} is already being used for a project`,
    );
  });
  it('should return true if walletAddress is smart contract address in mainnet', async () => {
    await ProjectAddress.createQueryBuilder()
      .delete()
      .from(ProjectAddress)
      .where('address = :address', {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      })
      .execute();
    await Project.createQueryBuilder()
      .delete()
      .from(Project)
      .where('walletAddress = :address', {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      })
      .execute();

    // DAI address https://etherscan.io/token/0x6b175474e89094c44da98b954eedeac495271d0f
    const walletAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: walletAddress,
      },
    });
    assert.equal(result.data.data.walletAddressIsValid, true);
  });

  it('should return true if walletAddress is smart contract address in xdai', async () => {
    // GIV address https://blockscout.com/xdai/mainnet/token/0x4f4F9b8D5B4d0Dc10506e5551B0513B61fD59e75/token-transfers
    const walletAddress = '0x4f4F9b8D5B4d0Dc10506e5551B0513B61fD59e75';
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: walletAddress,
      },
    });
    assert.equal(result.data.data.walletAddressIsValid, true);
  });

  it('should throw error for existing walletAddress - upperCase', async () => {
    const upperCaseWalletAddress = SEED_DATA.FIRST_PROJECT.walletAddress
      ?.toUpperCase()
      // This replace is because ethereum wallet address should begin with 0x ad toUpperCase make it corrupted
      .replace('0X', '0x') as string;
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: upperCaseWalletAddress,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      `Address ${upperCaseWalletAddress} is already being used for a project`,
    );
  });
  it('should throw error for existing walletAddress - lowerCase', async () => {
    const lowerCaseWalletAddress =
      SEED_DATA.FIRST_PROJECT.walletAddress?.toLowerCase();
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsValid,
      variables: {
        address: lowerCaseWalletAddress,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      `Address ${lowerCaseWalletAddress} is already being used for a project`,
    );
  });
}

function projectByIdTestCases() {
  it('should return project with id', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.equal(result.data.data.projectById.slug, project.slug);
    assert.isNotEmpty(result.data.data.projectById.addresses);
    assert.isOk(result.data.data.projectById.adminUser.walletAddress);
    assert.isOk(result.data.data.projectById.adminUser.firstName);
    assert.isNotOk(result.data.data.projectById.adminUser.email);
    assert.isOk(result.data.data.projectById.categories[0].mainCategory.title);
  });
  it('should return error for invalid id', async () => {
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        // To make use id is invalid
        id: 9999999,
      },
    });
    assert.equal(
      result.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('should return reaction when user liked the project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const reaction = await Reaction.create({
      userId: user.id,
      projectId: project.id,
      reaction: 'heart',
    }).save();
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,
        connectedWalletUserId: user.id,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.equal(result.data.data.projectById.reaction.id, reaction.id);
    assert.isOk(result.data.data.projectById.adminUser.walletAddress);
    assert.isOk(result.data.data.projectById.adminUser.firstName);
    assert.isNotOk(result.data.data.projectById.adminUser.email);
  });
  it('should not return reaction when user doesnt exist', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,

        // To make sure there is no user with that Id
        connectedWalletUserId: 9999999,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.isOk(result.data.data.projectById.adminUser.walletAddress);
    assert.isOk(result.data.data.projectById.adminUser.firstName);
    assert.isNotOk(result.data.data.projectById.adminUser.email);
    assert.isNotOk(result.data.data.projectById.reaction);
  });
  it('should not return reaction when user didnt like the project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: project.id,
        connectedWalletUserId: user.id,
      },
    });
    assert.equal(result.data.data.projectById.id, project.id);
    assert.isNotOk(result.data.data.projectById.reaction);
    assert.isOk(result.data.data.projectById.adminUser.walletAddress);
    assert.isOk(result.data.data.projectById.adminUser.firstName);
    assert.isNotOk(result.data.data.projectById.adminUser.email);
  });
  it('should not return drafted projects if not logged in', async () => {
    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: draftedProject.id,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return drafted projects of logged in user', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: draftedProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectById;
    assert.equal(Number(project.id), draftedProject.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
  });
  it('should not return drafted project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: draftedProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
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
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });

  it('should not return cancelled projects if not logged in', async () => {
    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(graphqlUrl, {
      query: projectByIdQuery,
      variables: {
        id: cancelledProject.id,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return cancelled projects of logged in user', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: cancelledProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectById;
    assert.equal(Number(project.id), cancelledProject.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
  });
  it('should not return cancelled project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: projectByIdQuery,
        variables: {
          id: cancelledProject.id,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
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
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
}

function walletAddressIsPurpleListedTestCases() {
  it('should return true if walletAddress is purpleListed', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });

    await addNewProjectAddress({
      address: walletAddress,
      networkId: NETWORK_IDS.XDAI,
      project,
      user,
    });
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isTrue(result.data.data.walletAddressIsPurpleListed);
  });
  it('should return true if wallet address is from a verifiedProject', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isTrue(result.data.data.walletAddressIsPurpleListed);
  });
  it('should return true if sent walletAddress is in upperCase', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress.toUpperCase(),
      },
    });
    assert.isTrue(result.data.data.walletAddressIsPurpleListed);
  });
  it('should return false if wallet address is from a nonverified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: false,
    });
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isFalse(result.data.data.walletAddressIsPurpleListed);
  });
  it('should return false if wallet address is from a nonActive verified project', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
      statusId: ProjStatus.drafted,
    });
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isFalse(result.data.data.walletAddressIsPurpleListed);
  });
  it('should return false if its a random non related address', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const result = await axios.post(graphqlUrl, {
      query: walletAddressIsPurpleListed,
      variables: {
        address: walletAddress,
      },
    });
    assert.isFalse(result.data.data.walletAddressIsPurpleListed);
  });
}

function getPurpleListTestCases() {
  it('should return purpleAddress records', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });

    await addNewProjectAddress({
      address: walletAddress,
      networkId: NETWORK_IDS.XDAI,
      project,
      user,
    });
    const result = await axios.post(graphqlUrl, {
      query: getPurpleList,
    });
    assert.isOk(result.data.data.getPurpleList);
    assert.isTrue(
      result.data.data.getPurpleList.includes(walletAddress.toLowerCase()),
    );
  });
  it('should return verifiedProject wallet address', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: true,
    });
    const result = await axios.post(graphqlUrl, {
      query: getPurpleList,
    });
    assert.isOk(result.data.data.getPurpleList);
    assert.isTrue(
      result.data.data.getPurpleList.includes(walletAddress.toLowerCase()),
    );
  });
  it('should not return non-verified project wallet address', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress,
      verified: false,
    });
    const result = await axios.post(graphqlUrl, {
      query: getPurpleList,
    });
    assert.isOk(result.data.data.getPurpleList);
    assert.isFalse(
      result.data.data.getPurpleList.includes(walletAddress.toLowerCase()),
    );
  });
}

function featuredProjectUpdateTestCases() {
  it('should return a specific featured project update', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      reviewStatus: ReviewStatus.Listed,
      listed: true,
    });

    const projectUpdate = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project.id,
      content: 'TestProjectUpdate1',
      title: 'testEditProjectUpdate1',
      createdAt: new Date(),
      isMain: false,
    }).save();

    await saveFeaturedProjectDirectlyToDb(
      Number(project.id),
      Number(projectUpdate.id),
    );

    const result = await axios.post(graphqlUrl, {
      query: fetchFeaturedProjectUpdate,
      variables: {
        projectId: project.id,
      },
    });

    assert.equal(
      Number(result.data.data.featuredProjectUpdate.projectId),
      project.id,
    );
    assert.equal(
      Number(result.data.data.featuredProjectUpdate.id),
      projectUpdate.id,
    );
  });
}

function featureProjectsTestCases() {
  before(async () => {
    await FeaturedUpdate.clear();
  });
  it('should return all active projects that have been featured', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const settings: [ReviewStatus, ProjStatus][] = [
      [ReviewStatus.Listed, ProjStatus.active],
      [ReviewStatus.Listed, ProjStatus.active],
      [ReviewStatus.NotListed, ProjStatus.active], // Not listed
      [ReviewStatus.NotReviewed, ProjStatus.active], // Not listed
      [ReviewStatus.Listed, ProjStatus.deactive], // Not active
    ];
    const projects: Project[] = [];
    for (const element of settings) {
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        reviewStatus: element[0],
        statusId: element[1],
      });
      projects.push(project);
    }
    const projectUpdatePromises = projects.map(project => {
      return ProjectUpdate.create({
        userId: user!.id,
        projectId: project.id,
        content: 'TestProjectUpdate',
        title: 'testEditProjectUpdate',
        createdAt: new Date(),
        isMain: false,
      }).save();
    });
    const projectUpdates = await Promise.all(projectUpdatePromises);
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const projectUpdate = projectUpdates[i];
      const featuredProject = await saveFeaturedProjectDirectlyToDb(
        Number(project.id),
        Number(projectUpdate.id),
      );
      // MUST HAVE POSITION OR WILL NOT BE DISPLAYED
      featuredProject.position = i + 1;
      await featuredProject.save();
    }

    const take = 10;
    const result = await axios.post(graphqlUrl, {
      query: fetchFeaturedProjects,
      variables: {
        take,
      },
    });

    const featuredProjects = result.data.data.featuredProjects.projects;
    const totalCount = result.data.data.featuredProjects.totalCount;

    assert.equal(totalCount, 2);
    assert.isTrue(featuredProjects[0].featuredUpdate.position === 1);
    assert.equal(Number(featuredProjects[0].id), projects[0].id); // Listed and Active
    assert.equal(Number(featuredProjects[1].id), projects[1].id); // Listed and Active
  });
}

function projectUpdatesTestCases() {
  it('should return all project updates limited by take and ordered by craetedAt desc', async () => {
    const update1Date = moment().add(10, 'days').toDate();
    const update2Date = moment().add(11, 'days').toDate();
    const update3Date = new Date();
    const update4Date = new Date();
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const project3 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
      latestUpdateCreationDate: update4Date,
    });
    const user = SEED_DATA.FIRST_USER;

    const projectUpdate1 = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project.id,
      content: 'TestProjectUpdate1',
      title: 'testEditProjectUpdate1',
      createdAt: update1Date,
      isMain: false,
    }).save();
    const projectUpdate2 = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project2.id,
      content: 'TestProjectUpdate2',
      title: 'testEditProjectUpdate2',
      createdAt: update2Date,
      isMain: false,
    }).save();
    const projectUpdate3 = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project2.id,
      content: 'TestProjectUpdateExcluded',
      title: 'testEditProjectUpdateExcluded',
      createdAt: update3Date,
      isMain: false,
    }).save();
    const projectUpdate4 = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project3.id,
      content: 'TestProjectUpdateExcluded',
      title: 'testEditProjectUpdateExcluded',
      createdAt: update4Date,
      isMain: false,
    }).save();

    await Project.update(project.id, {
      latestUpdateCreationDate: update1Date,
    });
    await Project.update(project2.id, {
      latestUpdateCreationDate: update2Date,
    });

    const takeLatestUpdates = 4; // there are other previously created updates
    const result = await axios.post(graphqlUrl, {
      query: fetchLatestProjectUpdates,
      variables: {
        takeLatestUpdates,
      },
    });

    assert.isOk(result);
    const data = result.data.data.projectUpdates.projectUpdates;
    // assert only project's most recent updates are returned
    assert.equal(data.length, 2);
    for (const pu of data) {
      assert.isTrue(
        pu.id === projectUpdate1.id ||
          pu.id === projectUpdate3.id ||
          pu.id !== projectUpdate2.id ||
          pu.id !== projectUpdate4.id,
      );
    }
    // Assert ordered (which matches order of creation) and project data present
    assert.isTrue(new Date(data[0].createdAt) > new Date(data[1].createdAt));
    assert.isOk(data[0].project.slug);
    assert.equal(data[0].project.slug, project2.slug);
  });
}

function projectSearchTestCases() {
  it('should return projects with a typo in the end of searchTerm', async () => {
    const limit = 1;
    const USER_DATA = SEED_DATA.FIRST_USER;
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit,
        // Typo in the title
        searchTerm: SEED_DATA.SECOND_PROJECT.title.slice(0, -1) + 'a',
        connectedWalletUserId: USER_DATA.id,
      },
    });

    const projects = result.data.data.allProjects.projects;
    assert.equal(projects.length, limit);
    assert.equal(projects[0].title, SEED_DATA.SECOND_PROJECT.title);
    assert.equal(projects[0].slug, SEED_DATA.SECOND_PROJECT.slug);
    assert.equal(projects[0].id, SEED_DATA.SECOND_PROJECT.id);
  });

  it('should return projects with the project title inverted in the searchTerm', async () => {
    const limit = 1;
    const USER_DATA = SEED_DATA.FIRST_USER;
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit,
        searchTerm: SEED_DATA.SECOND_PROJECT.title
          .split(' ')
          .reverse()
          .join(' '),
        connectedWalletUserId: USER_DATA.id,
      },
    });

    const projects = result.data.data.allProjects.projects;
    assert.equal(projects.length, limit);
    assert.equal(projects[0].title, SEED_DATA.SECOND_PROJECT.title);
    assert.equal(projects[0].slug, SEED_DATA.SECOND_PROJECT.slug);
    assert.equal(projects[0].id, SEED_DATA.SECOND_PROJECT.id);
  });
}

function getProjectUpdatesTestCases() {
  it('should return project updates with current take', async () => {
    const take = 2;
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectUpdatesQuery,
      variables: {
        projectId: SEED_DATA.FIRST_PROJECT.id,
        take,
      },
    });
    assert.isOk(result);
    const projectUpdates = result.data.data.getProjectUpdates;
    assert.equal(projectUpdates.length, take);
  });

  it('should return correct reaction', async () => {
    const take = 3;
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectUpdatesQuery,
      variables: {
        projectId: SEED_DATA.FIRST_PROJECT.id,
        take,
        connectedWalletUserId: SEED_DATA.FIRST_USER.id,
      },
    });
    assert.isOk(result);
    // const projectUpdates: ProjectUpdate[] = result.data.data.getProjectUpdates;

    // const likedProject = projectUpdates.find(
    //   pu => +pu.id === PROJECT_UPDATE_SEED_DATA.FIRST_PROJECT_UPDATE.id,
    // );
    // const noLikedProject = projectUpdates.find(
    //   pu => +pu.id !== PROJECT_UPDATE_SEED_DATA.FIRST_PROJECT_UPDATE.id,
    // );

    // assert.equal(
    //   likedProject?.reaction?.id,
    //   REACTION_SEED_DATA.FIRST_LIKED_PROJECT_UPDATE_REACTION.id,
    // );
    // assert.isNull(noLikedProject?.reaction);
  });
}

function projectBySlugTestCases() {
  it('should return projects with indicated slug and verification form status if owner', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const user = (await User.findOne({
      where: {
        id: project1.adminUserId,
      },
    })) as User;

    const verificationForm = await ProjectVerificationForm.create({
      project: project1,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
    }).save();

    const accessToken = await generateTestAccessToken(user!.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectBySlugQuery,
        variables: {
          slug: project1.slug,
          connectedWalletUserId: user!.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);
    assert.isOk(project.verificationFormStatus);
    assert.equal(project.verificationFormStatus, verificationForm.status);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
    assert.isOk(project.categories[0].mainCategory.title);
  });

  it('should return projects with indicated slug', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const sampleProject1 = {
      title: walletAddress,
      adminUserId: SEED_DATA.FIRST_USER.id,
      addresses: [
        {
          address: walletAddress,
          networkId: NETWORK_IDS.XDAI,
          chainType: ChainType.EVM,
        },
      ],
    };
    const res1 = await axios.post(
      graphqlUrl,
      {
        query: createProjectQuery,
        variables: {
          project: sampleProject1,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const _project = res1.data.data.createProject;
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: _project.slug,
      },
    });
    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), Number(_project.id));
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.givbackFactor);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
    assert.isNotEmpty(project.addresses);
    assert.equal(project.addresses[0].address, walletAddress);
    assert.equal(project.addresses[0].chainType, ChainType.EVM);
  });

  it('should return projects including projectPower', async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBoosting.clear();
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    const walletAddress = generateRandomEtheriumAddress();
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      walletAddress,
    });
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const roundNumber = project1.id * 10;
    await insertSinglePowerBoosting({
      user,
      project: project1,
      percentage: 10,
    });

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 200,
    });

    await setPowerRound(roundNumber);

    await refreshProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: project1.slug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);

    assert.exists(project.projectPower);
    assert.isTrue(project.projectPower.totalPower > 0);
  });

  it('should return projects including active ManuallySelected campaigns', async () => {
    const projectWithCampaign = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const projectWithoutCampaign = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const campaign = await Campaign.create({
      isActive: true,
      type: CampaignType.ManuallySelected,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      relatedProjectsSlugs: [projectWithCampaign.slug as string],
      order: 1,
    }).save();
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: projectWithCampaign.slug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), projectWithCampaign.id);

    assert.exists(project.campaigns);
    assert.isNotEmpty(project.campaigns);

    const projectWithoutCampaignResult = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: projectWithoutCampaign.slug,
      },
    });

    const project2 = projectWithoutCampaignResult.data.data.projectBySlug;
    assert.equal(Number(project2.id), projectWithoutCampaign.id);

    assert.isEmpty(project2.campaigns);

    await campaign.remove();
  });
  it('should return projects including active SortField campaigns', async () => {
    const projectWithCampaign = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const campaign = await Campaign.create({
      isActive: true,
      type: CampaignType.SortField,
      sortingField: CampaignSortingField.Newest,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      order: 1,
    }).save();
    await cacheProjectCampaigns();
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: projectWithCampaign.slug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), projectWithCampaign.id);

    assert.exists(project.campaigns);
    assert.isNotEmpty(project.campaigns);
    assert.equal(project.campaigns[0].id, campaign.id);

    const projectWithoutCampaignResult = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        // and old project that I'm sure it would not be in the Newest campaign
        slug: SEED_DATA.FIRST_PROJECT.slug,
      },
    });

    const project2 = projectWithoutCampaignResult.data.data.projectBySlug;
    assert.equal(Number(project2.id), SEED_DATA.FIRST_PROJECT.id);

    assert.isEmpty(project2.campaigns);

    await campaign.remove();
  });

  it('should return projects including active FilterField campaigns (acceptOnGnosis)', async () => {
    // In this filter the default sorting for projects is givPower so I need to create a project with power
    // to be sure that it will be in the campaign
    await PowerBoosting.clear();
    await InstantPowerBalance.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const projectWithCampaign = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.XDAI,
    });

    const projectWithoutCampaign = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.POLYGON,
    });

    await Promise.all(
      [[user1, projectWithCampaign, 10]].map(item => {
        const [user, project, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project,
          percentage,
        });
      }),
    );

    await saveOrUpdateInstantPowerBalances([
      {
        userId: user1.id,
        balance: 10000,
        balanceAggregatorUpdatedAt: new Date(1_000_000),
      },
    ]);

    await updateInstantBoosting();

    const campaign = await Campaign.create({
      isActive: true,
      type: CampaignType.FilterFields,
      filterFields: [CampaignFilterField.acceptFundOnGnosis],
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      order: 1,
    }).save();
    await cacheProjectCampaigns();
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: projectWithCampaign.slug,
      },
    });

    const fetchedProject = result.data.data.projectBySlug;
    assert.equal(Number(fetchedProject.id), projectWithCampaign.id);

    assert.exists(fetchedProject.campaigns);
    assert.isNotEmpty(fetchedProject.campaigns);
    assert.equal(fetchedProject.campaigns[0].id, campaign.id);

    const projectWithoutCampaignResult = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: projectWithoutCampaign.slug,
      },
    });

    const project2 = projectWithoutCampaignResult.data.data.projectBySlug;
    assert.equal(Number(project2.id), projectWithoutCampaign.id);

    assert.isEmpty(project2.campaigns);

    await campaign.remove();
  });

  it('should return projects including active campaigns, even when sent slug is in the slugHistory of project', async () => {
    const projectWithCampaign = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const previousSlug = `${String(new Date().getTime())}-previous`;
    projectWithCampaign.slugHistory = [previousSlug];
    await projectWithCampaign.save();

    const campaign = await Campaign.create({
      isActive: true,
      type: CampaignType.ManuallySelected,
      slug: generateRandomString(),
      title: 'title1',
      description: 'description1',
      photo: 'https://google.com',
      relatedProjectsSlugs: [previousSlug],
      order: 1,
    }).save();
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: previousSlug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), projectWithCampaign.id);

    assert.exists(project.campaigns);
    assert.isNotEmpty(project.campaigns);

    await campaign.remove();
  });

  it('should return projects including project future power rank', async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBoosting.clear();
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    const walletAddress = generateRandomEtheriumAddress();
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      walletAddress,
    });
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());
    const project4 = await saveProjectDirectlyToDb(createProjectData()); // Not boosted project
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const roundNumber = project1.id * 10;

    const boosting1 = await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    const boosting2 = await insertSinglePowerBoosting({
      user: user1,
      project: project2,
      percentage: 20,
    });
    const boosting3 = await insertSinglePowerBoosting({
      user: user1,
      project: project3,
      percentage: 30,
    });
    const boosting4 = await insertSinglePowerBoosting({
      user: user1,
      project: project4,
      percentage: 40,
    });
    await takePowerBoostingSnapshot();
    let [powerSnapshots] = await findPowerSnapshots();
    let snapshot = powerSnapshots[0];

    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 200,
    });

    boosting1.percentage = 100;
    boosting2.percentage = 0;
    boosting3.percentage = 0;
    boosting4.percentage = 0;

    await PowerBoosting.save([boosting1, boosting2, boosting3, boosting4]);

    await takePowerBoostingSnapshot();

    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[1];
    // Set next round for filling future power rank
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();
    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 200,
    });

    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();
    await refreshProjectPowerView();
    await refreshProjectFuturePowerView();

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: project1.slug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);
    assert.exists(project.projectPower);
    assert.isTrue(project.projectPower.totalPower > 0);

    assert.equal(project.projectPower.powerRank, 4);
    assert.equal(project.projectFuturePower.powerRank, 1);
  });

  it('should return projects with null project future power rank when no snapshot is synced', async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBoosting.clear();
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    const walletAddress = generateRandomEtheriumAddress();
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      walletAddress,
    });
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());
    const project4 = await saveProjectDirectlyToDb(createProjectData()); // Not boosted project
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const roundNumber = project1.id * 10;

    const boosting1 = await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    const boosting2 = await insertSinglePowerBoosting({
      user: user1,
      project: project2,
      percentage: 20,
    });
    const boosting3 = await insertSinglePowerBoosting({
      user: user1,
      project: project3,
      percentage: 30,
    });
    const boosting4 = await insertSinglePowerBoosting({
      user: user1,
      project: project4,
      percentage: 40,
    });
    await takePowerBoostingSnapshot();
    let [powerSnapshots] = await findPowerSnapshots();
    let snapshot = powerSnapshots[0];
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 200,
    });

    boosting1.percentage = 100;
    boosting2.percentage = 0;
    boosting3.percentage = 0;
    boosting4.percentage = 0;

    await PowerBoosting.save([boosting1, boosting2, boosting3, boosting4]);

    await takePowerBoostingSnapshot();

    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[1];
    // Set next round for filling future power rank
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();
    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 0,
    });

    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();
    await refreshProjectPowerView();
    await refreshProjectFuturePowerView(false);

    let result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: project1.slug,
      },
    });

    let project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);
    assert.exists(project.projectPower);
    assert.equal(project.projectPower.totalPower, 20);
    assert.isNull(project.projectFuturePower);
    // Add sync flag
    await refreshProjectFuturePowerView(true);

    result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: project1.slug,
      },
    });
    project = result.data.data.projectBySlug;
    assert.isNotNull(project.projectFuturePower);
    assert.equal(project.projectFuturePower.totalPower, 0);
  });

  it('should not return drafted if not logged in', async () => {
    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: draftedProject.slug,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should not return drafted project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectBySlugQuery,
        variables: {
          slug: draftedProject.slug,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
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
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return drafted if logged in', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const draftedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectBySlugQuery,
        variables: {
          slug: draftedProject.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), draftedProject.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
  });

  it('should not return cancelled if not logged in', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: project.slug,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should not return cancelled project is user is logged in but is not owner of project', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.SECOND_USER.id);

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectBySlugQuery,
        variables: {
          slug: project.slug,
          connectedWalletUserId: SEED_DATA.FIRST_USER.id,
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
      errorMessages.YOU_DONT_HAVE_ACCESS_TO_VIEW_THIS_PROJECT,
    );
  });
  it('should return cancelled if logged in', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);

    const cancelledProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      statusId: ProjStatus.cancelled,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchProjectBySlugQuery,
        variables: {
          slug: cancelledProject.slug,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), cancelledProject.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
  });

  it('should return project instant power get by slug', async () => {
    await PowerBoosting.clear();
    await InstantPowerBalance.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());

    await Promise.all(
      [
        [user1, project1, 100],
        [user2, project1, 100],
      ].map(item => {
        const [user, p, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project: p,
          percentage,
        });
      }),
    );

    await saveOrUpdateInstantPowerBalances([
      {
        userId: user1.id,
        balance: 10000,
        balanceAggregatorUpdatedAt: new Date(1_000_000),
      },
      {
        userId: user2.id,
        balance: 1000,
        balanceAggregatorUpdatedAt: new Date(1_000_000),
      },
    ]);

    await updateInstantBoosting();

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectBySlugQuery,
      variables: {
        slug: project1.slug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(project.projectInstantPower.totalPower, 11000);
  });
}

function similarProjectsBySlugTestCases() {
  it('should return related projects with the exact same categories', async () => {
    const viewedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food2', 'food3'],
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food2', 'food3'],
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchSimilarProjectsBySlugQuery,
      variables: {
        slug: viewedProject.slug,
      },
    });

    const projects = result.data.data.similarProjectsBySlug.projects;
    const totalCount = result.data.data.similarProjectsBySlug.totalCount;

    // excludes viewed project
    assert.equal(totalCount, 1);
    assert.equal(projects[0].id, secondProject.id);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
    });
  });
  it('should return projects with at least one matching category, if not all matched', async () => {
    const viewedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food4', 'food8'],
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food5', 'food8'],
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchSimilarProjectsBySlugQuery,
      variables: {
        slug: viewedProject.slug,
        take: 3,
        skip: 0,
      },
    });

    const c = await Category.findOne({ where: { name: 'food8' } });
    const [, relatedCount] = await Project.createQueryBuilder('project')
      .innerJoinAndSelect('project.categories', 'categories')
      .where('categories.id IN (:...ids)', { ids: [c?.id] })
      .andWhere('project.id != :id', { id: viewedProject.id })
      .take(1)
      .skip(0)
      .getManyAndCount();

    const projects = result.data.data.similarProjectsBySlug.projects;
    const totalCount = result.data.data.similarProjectsBySlug.totalCount;

    // matched food 8 category and returns related projects
    assert.equal(projects[0].id, secondProject.id);
    assert.isNotEmpty(projects[0].addresses);
    assert.equal(totalCount, relatedCount);
    assert.equal(totalCount, 1);
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
    });
  });
  it('should return projects with the same admin, if no category matches', async () => {
    const viewedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: ['food6'],
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchSimilarProjectsBySlugQuery,
      variables: {
        slug: viewedProject.slug,
      },
    });

    const projects = result.data.data.similarProjectsBySlug.projects;
    projects.forEach(project => {
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.adminUser.firstName);
      assert.isNotOk(project.adminUser.email);
    });
    const totalCount = result.data.data.similarProjectsBySlug.totalCount;

    const [, relatedCount] = await Project.createQueryBuilder('project')
      .innerJoinAndSelect('project.categories', 'categories')
      .where('project.id != :id', { id: viewedProject?.id })
      .andWhere('project.adminUserId = :ownerId', {
        ownerId: SEED_DATA.FIRST_USER.id,
      })
      .andWhere(
        `project.statusId = ${ProjStatus.active} AND project.reviewStatus = :reviewStatus`,
        { reviewStatus: ReviewStatus.Listed },
      )
      .take(1)
      .skip(0)
      .getManyAndCount();

    // since no project matched the food6 category it will return all admin projects
    // all projects belong to admin '1' by default
    assert.equal(totalCount, relatedCount);

    // viewed project should not be present in the result set
    const currentViewedProject = projects.find(
      project => project.id === viewedProject.id,
    );
    assert.isUndefined(currentViewedProject);
  });
  it('should not throw error if project doesnt have any category ', async () => {
    const viewedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      categories: [],
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchSimilarProjectsBySlugQuery,
      variables: {
        slug: viewedProject.slug,
      },
    });
    assert.isArray(result.data.data.similarProjectsBySlug.projects);
  });
}

function addProjectUpdateTestCases() {
  it('should add project update successfuly ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: project.id,
          content: 'TestProjectUpdateFateme',
          title: 'testProjectUpdateFateme',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.data.addProjectUpdate.title,
      'testProjectUpdateFateme',
    );
  });

  it('should change verificationStatus to null after adding update', async () => {
    const verifiedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verificationStatus: RevokeSteps.UpForRevoking,
    });
    const revokedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verificationStatus: RevokeSteps.Revoked,
    });
    const accessTokenUser1 = await generateTestAccessToken(
      verifiedProject.adminUserId,
    );

    await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: verifiedProject.id,
          content: 'Test Project Update content',
          title: 'test Project Update title',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: revokedProject.id,
          content: 'Test Project Update content',
          title: 'test Project Update title',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    const _verifiedProject = await Project.findOne({
      where: { id: verifiedProject.id },
    });
    const _revokedProject = await Project.findOne({
      where: { id: revokedProject.id },
    });
    assert.equal(_verifiedProject?.verificationStatus, null);
    assert.equal(_revokedProject?.verificationStatus, RevokeSteps.Revoked);
  });

  it('should can not add project update because of ownerShip ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const accessTokenUser1 = await generateTestAccessToken(user1.id);

    // Add projectUpdate with accessToken user1
    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: project.id,
          content: 'TestProjectUpdateFateme',
          title: 'testProjectUpdateFateme',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should can not add project update because of not found project ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const projectUpdateCount = await ProjectUpdate.count();

    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: Number(projectUpdateCount + 1),
          content: 'TestProjectUpdateFateme2',
          title: 'testProjectUpdateFateme2',
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
  it('should can not add project update because of lack of authentication ', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: addProjectUpdateQuery,
      variables: {
        projectId: Number(project.id),
        content: 'TestProjectUpdateFateme2',
        title: 'testProjectUpdateFateme2',
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
  it('should can not add project update because user not found ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    await User.delete({ id: user.id });
    const projectCount = await Project.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: addProjectUpdateQuery,
        variables: {
          projectId: Number(projectCount || 1),
          content: 'TestProjectUpdateFateme4',
          title: 'testAddProjectUpdateFateme4',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, errorMessages.USER_NOT_FOUND);
  });
}

function editProjectUpdateTestCases() {
  it('should edit project update successfully ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const updateProject = await ProjectUpdate.create({
      userId: user.id,
      projectId: project.id,
      content: 'TestProjectUpdateFateme',
      title: 'testEditProjectUpdateFateme',
      createdAt: new Date(),
      isMain: false,
    }).save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: editProjectUpdateQuery,
        variables: {
          updateId: updateProject.id,
          content: '<div>TestProjectUpdateAfterUpdateFateme</div>',
          title: 'testEditProjectUpdateAfterUpdateFateme',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.editProjectUpdate.title,
      'testEditProjectUpdateAfterUpdateFateme',
    );
    assert.equal(
      result.data.data.editProjectUpdate.content,
      '<div>TestProjectUpdateAfterUpdateFateme</div>',
    );
    assert.equal(
      result.data.data.editProjectUpdate.contentSummary,
      'TestProjectUpdateAfterUpdateFateme',
    );
  });
  it('should can not edit project update because of ownerShip ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData());

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const accessTokenUser1 = await generateTestAccessToken(user1.id);

    const updateProject = await ProjectUpdate.create({
      userId: user.id,
      projectId: project.id,
      content: 'TestProjectUpdateFateme',
      title: 'testEditProjectUpdateFateme',
      createdAt: new Date(),
      isMain: false,
    }).save();
    // Add projectUpdate with accessToken user1
    const result = await axios.post(
      graphqlUrl,
      {
        query: editProjectUpdateQuery,
        variables: {
          updateId: Number(updateProject.id),
          content: 'TestProjectUpdateAfterUpdateFateme',
          title: 'testEditProjectAfterUpdateFateme',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should can not edit project update because of not found project ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testEditProjectUpdateFateme',
      isEmailVerified: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const projectUpdateCount = await ProjectUpdate.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: editProjectUpdateQuery,
        variables: {
          updateId: Number(projectUpdateCount + 10),
          content: 'TestProjectUpdateFateme2',
          title: 'testEditProjectUpdateFateme2',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'Project update not found.');
  });
  it('should can not edit project update because of lack of authentication ', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: editProjectUpdateQuery,
      variables: {
        updateId: Number(project.id),
        content: 'TestProjectAfterUpdateFateme2',
        title: 'testEditProjectAfterUpdateFateme2',
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
}

function deleteProjectUpdateTestCases() {
  it('should delete project update successfully ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });

    const updateProject = await ProjectUpdate.create({
      userId: user.id,
      projectId: project.id,
      content: 'TestProjectUpdateFateme',
      title: 'testDeleteProjectUpdateFateme',
      createdAt: new Date(),
      isMain: false,
    }).save();

    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteProjectUpdateQuery,
        variables: {
          updateId: updateProject.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.data.deleteProjectUpdate, true);
  });
  it('should can not delete project update because of ownerShip ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
    });
    const accessTokenUser1 = await generateTestAccessToken(user1.id);

    const updateProject = await ProjectUpdate.create({
      userId: user.id,
      projectId: project.id,
      content: 'TestProjectUpdateFateme',
      title: 'testDeleteProjectUpdateFateme',
      createdAt: new Date(),
      isMain: false,
    }).save();
    // Add projectUpdate with accessToken user1
    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteProjectUpdateQuery,
        variables: {
          updateId: Number(updateProject.id),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should can not delete project update because of not found project ', async () => {
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'testDeleteProjectUpdateFateme',
      isEmailVerified: true,
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const projectUpdateCount = await ProjectUpdate.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteProjectUpdateQuery,
        variables: {
          updateId: Number(projectUpdateCount + 10),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.errors[0].message, 'Project update not found.');
  });
  it('should can not delete project update because of lack of authentication ', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await axios.post(graphqlUrl, {
      query: deleteProjectUpdateQuery,
      variables: {
        updateId: Number(project.id),
        content: 'TestProjectAfterUpdateFateme2',
        title: 'testDeleteProjectAfterUpdateFateme2',
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });
}

function getTokensDetailsTestCases() {
  it('should return token details', async () => {
    const tokenDetails = seedTokens.find(
      token => token.address === '0x6b175474e89094c44da98b954eedeac495271d0f',
    );

    const result = await axios.post(graphqlUrl, {
      query: getTokensDetailsQuery,
      variables: {
        address: tokenDetails?.address,
        networkId: tokenDetails?.networkId,
      },
    });

    const token = result.data.data.getTokensDetails;

    assert.equal(token.address, tokenDetails?.address);
    assert.equal(token.symbol, tokenDetails?.symbol);
    assert.equal(token.decimals, tokenDetails?.decimals);
    assert.equal(token.name, tokenDetails?.name);
    assert.equal(token.networkId, tokenDetails?.networkId);
    assert.equal(token.chainType, ChainType.EVM);
  });

  it('should return null if token not found', async () => {
    const result = await axios.post(graphqlUrl, {
      query: getTokensDetailsQuery,
      variables: {
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        networkId: NETWORK_IDS.POLYGON,
      },
    });

    const error = result.data.errors[0];
    assert.equal(error.message, 'Token not found');
  });
}

function deleteDraftProjectTestCases() {
  it('should delete draft project successfully ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      statusId: ProjStatus.drafted,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteDraftProjectQuery,
        variables: {
          projectId: project.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.data.deleteDraftProject, true);
  });
  it('should can not delete draft project because of ownerShip ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      statusId: ProjStatus.drafted,
    });
    const accessTokenUser1 = await generateTestAccessToken(user1.id);

    // Add projectUpdate with accessToken user1
    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteDraftProjectQuery,
        variables: {
          projectId: project.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessTokenUser1}`,
        },
      },
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ARE_NOT_THE_OWNER_OF_PROJECT,
    );
  });
  it('should can not delete draft project because of not found project ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const projectCount = await Project.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteDraftProjectQuery,
        variables: {
          projectId: Number(projectCount + 10),
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

  it('should can not delete draft project because status ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      adminUserId: user.id,
      statusId: ProjStatus.active,
    });

    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteDraftProjectQuery,
        variables: {
          projectId: project.id,
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
      errorMessages.ONLY_DRAFTED_PROJECTS_CAN_BE_DELETED,
    );
  });
}
