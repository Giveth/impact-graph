import { assert } from 'chai';
import 'mocha';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  PROJECT_UPDATE_SEED_DATA,
  REACTION_SEED_DATA,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
  sleep,
} from '../../test/testUtils';
import axios from 'axios';
import {
  activateProjectQuery,
  addProjectUpdateQuery,
  createProjectQuery,
  deactivateProjectQuery,
  deleteProjectUpdateQuery,
  editProjectUpdateQuery,
  fetchLatestProjectUpdates,
  fetchLikedProjectsQuery,
  fetchMultiFilterAllProjectsQuery,
  fetchNewProjectsPerDate,
  fetchProjectsBySlugQuery,
  fetchProjectUpdatesQuery,
  fetchSimilarProjectsBySlugQuery,
  getProjectsAcceptTokensQuery,
  getPurpleList,
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
  SortingField,
} from '../entities/project';
import { Category } from '../entities/category';
import { Reaction } from '../entities/reaction';
import { ProjectStatus } from '../entities/projectStatus';
import { ProjectStatusHistory } from '../entities/projectStatusHistory';
import { User } from '../entities/user';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { Token } from '../entities/token';
import { NETWORK_IDS } from '../provider';
import {
  addNewProjectAddress,
  findAllRelatedAddressByWalletAddress,
  findProjectRecipientAddressByNetworkId,
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
import {
  findInCompletePowerSnapShots,
  insertSinglePowerBalanceSnapshot,
} from '../repositories/powerSnapshotRepository';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { ProjectAddress } from '../entities/projectAddress';
import moment from 'moment';
import { PowerBoosting } from '../entities/powerBoosting';
import { refreshUserProjectPowerView } from '../repositories/userProjectPowerViewRepository';
import { AppDataSource } from '../orm';
// We are using cache so redis needs to be cleared for tests with same filters
import { redis } from '../redis';
import { Campaign, CampaignType } from '../entities/campaign';
import { generateRandomString } from '../utils/utils';
import { findProjectById } from '../repositories/projectRepository';

describe('createProject test cases --->', createProjectTestCases);
describe('updateProject test cases --->', updateProjectTestCases);

// search and filters
describe('all projects test cases --->', allProjectsTestCases);

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

describe('projectUpdates query test cases --->', projectUpdatesTestCases);

describe(
  'getProjectsAcceptTokens() test cases --->',
  getProjectsAcceptTokensTestCases,
);
// We may can delete this query
// describe('updateProjectStatus test cases --->', updateProjectStatusTestCases);

// describe('activateProject test cases --->', activateProjectTestCases);

describe('projectsPerDate() test cases --->', projectsPerDateTestCases);

function projectsPerDateTestCases() {
  it('should projects created in a time range', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      creationDate: moment().add(10, 'days').toDate(),
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      creationDate: moment().add(44, 'days').toDate(),
    });
    const projectsResponse = await axios.post(graphqlUrl, {
      query: fetchNewProjectsPerDate,
      variables: {
        fromDate: moment().add(9, 'days').toDate().toISOString().split('T')[0],
        toDate: moment().add(45, 'days').toDate().toISOString().split('T')[0],
      },
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
  it('should return all tokens for giveth projects', async () => {
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
  it('should return all tokens for trace projects', async () => {
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
  it('should just return ETH token for givingBlock projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await axios.post(graphqlUrl, {
      query: getProjectsAcceptTokensQuery,
      variables: {
        projectId: project.id,
      },
    });
    assert.isOk(result.data.data.getProjectAcceptTokens);
    assert.equal(result.data.data.getProjectAcceptTokens.length, 1);
    assert.equal(result.data.data.getProjectAcceptTokens[0].symbol, 'ETH');
    assert.equal(result.data.data.getProjectAcceptTokens[0].networkId, 1);
  });
}

function allProjectsTestCases() {
  it('should return projects search by owner', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        searchTerm: SEED_DATA.SECOND_USER.name,
      },
    });

    const projects = result.data.data.allProjects.projects;
    const secondUserProjects = await Project.find({
      where: {
        admin: String(SEED_DATA.SECOND_USER.id),
      },
    });

    assert.equal(projects.length, secondUserProjects.length);
    assert.equal(Number(projects[0]?.admin), SEED_DATA.SECOND_USER.id);
    assert.isNotEmpty(projects[0].addresses);
    projects.forEach(project => {
      assert.isNotOk(project.adminUser.email);
      assert.isOk(project.adminUser.firstName);
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.categories[0].mainCategory.title);
    });
  });

  it('should return projects with correct reaction', async () => {
    const limit = 1;
    const USER_DATA = SEED_DATA.FIRST_USER;

    // Project has not been liked
    let result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit,
        searchTerm: SEED_DATA.SECOND_PROJECT.title,
        connectedWalletUserId: USER_DATA.id,
      },
    });

    let projects = result.data.data.allProjects.projects;
    assert.equal(projects.length, limit);
    assert.isNull(projects[0]?.reaction);

    // Project has been liked, but connectedWalletUserIs is not filled
    result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit,
        searchTerm: SEED_DATA.FIRST_PROJECT.title,
      },
    });

    projects = result.data.data.allProjects.projects;
    assert.equal(projects.length, limit);
    assert.isNull(projects[0]?.reaction);

    // Project has been liked
    result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit,
        searchTerm: SEED_DATA.FIRST_PROJECT.title,
        connectedWalletUserId: USER_DATA.id,
      },
    });

    projects = result.data.data.allProjects.projects;
    assert.equal(projects.length, limit);
    assert.equal(
      projects[0]?.reaction?.id,
      REACTION_SEED_DATA.FIRST_LIKED_PROJECT_REACTION.id,
    );
    projects.forEach(project => {
      assert.isNotOk(project.adminUser.email);
      assert.isOk(project.adminUser.firstName);
      assert.isOk(project.adminUser.walletAddress);
    });
  });

  it('should return projects, sort by creationDate, DESC', async () => {
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.Newest,
      },
    });
    assert.equal(
      Number(result.data.data.allProjects.projects[0].id),
      secondProject.id,
    );
    assert.equal(
      Number(result.data.data.allProjects.projects[1].id),
      firstProject.id,
    );
  });

  it('should return projects, sort by updatedAt, DESC', async () => {
    const firstProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const secondProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    firstProject.title = String(new Date().getTime());
    firstProject.updatedAt = moment().add(2, 'days').toDate();
    await firstProject.save();

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.RecentlyUpdated,
      },
    });
    // First project should move to first position
    assert.equal(
      Number(result.data.data.allProjects.projects[0].id),
      firstProject.id,
    );
  });
  it('should return projects, sort by creationDate, ASC', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.Oldest,
      },
    });
    const projectsCount = result.data.data.allProjects.projects.length;
    const firstProjectIsOlder =
      new Date(result.data.data.allProjects.projects[0].creationDate) <
      new Date(
        result.data.data.allProjects.projects[projectsCount - 1].creationDate,
      );
    assert.isTrue(firstProjectIsOlder);
  });
  it('should return projects, filter by verified, true', async () => {
    // There is two verified projects so I just need to create a project with verified: false and listed:true
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['Verified'],
      },
    });
    assert.isNotEmpty(result.data.data.allProjects.projects);
    result.data.data.allProjects.projects.forEach(project =>
      assert.isTrue(project.verified),
    );
  });
  it('should return projects, filter by acceptGiv, true', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptGiv'],
      },
    });
    assert.isNotEmpty(result.data.data.allProjects.projects);
    result.data.data.allProjects.projects.forEach(project =>
      // currently givingBlocks projects doesnt accept GIV
      assert.notExists(project.givingBlocksId),
    );
  });
  it('should return projects, filter by boosted by givPower, true', async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBoosting.clear();
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
    });

    const roundNumber = project.id * 10;
    await insertSinglePowerBoosting({
      user,
      project,
      percentage: 100,
    });
    await takePowerBoostingSnapshot();
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 200,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['BoostedWithGivPower'],
        limit: 50,
      },
    });
    assert.isNotEmpty(result.data.data.allProjects.projects);
    result.data.data.allProjects.projects.forEach(projectQueried =>
      assert.isOk(projectQueried?.projectPower?.totalPower > 0),
    );
  });
  it('should return projects, filter from the givingblocks', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      givingBlocksId: '1234355',
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['GivingBlock'],
      },
    });
    assert.isNotEmpty(result.data.data.allProjects.projects);
    result.data.data.allProjects.projects.forEach(project =>
      assert.exists(project.givingBlocksId),
    );
  });
  it('should return projects, sort by reactions, DESC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      totalReactions: 100,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.MostLiked,
      },
    });
    assert.isTrue(
      result.data.data.allProjects.projects[0].totalReactions >= 100,
    );
  });
  it('should return projects, sort by donations, DESC', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      totalDonations: 100,
      qualityScore: 0,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.MostFunded,
      },
    });
    assert.isTrue(
      result.data.data.allProjects.projects[0].totalDonations >= 100,
    );
  });
  it('should return projects, sort by qualityScore, DESC', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      totalDonations: 100,
      qualityScore: 10000,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.QualityScore,
      },
    });
    assert.isTrue(
      Number(result.data.data.allProjects.projects[0].id) === project.id,
    );

    // default sort
    const result2 = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
    });
    assert.isTrue(
      Number(result2.data.data.allProjects.projects[0].id) === project.id,
    );
  });

  it('should return projects, sort by project power DESC', async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBoosting.clear();
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());
    const project4 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    }); // Not boosted -Not verified project
    const project5 = await saveProjectDirectlyToDb(createProjectData()); // Not boosted project

    const roundNumber = project3.id * 10;

    await Promise.all(
      [
        [user1, project1, 10],
        [user1, project2, 20],
        [user1, project3, 30],
        [user2, project1, 20],
        [user2, project2, 40],
        [user2, project3, 60],
      ].map(item => {
        const [user, project, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project,
          percentage,
        });
      }),
    );

    await takePowerBoostingSnapshot();
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });
    await insertSinglePowerBalanceSnapshot({
      userId: user2.id,
      powerSnapshotId: snapshot.id,
      balance: 20000,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();

    let result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.GIVPower,
        limit: 50,
      },
    });

    let projects = result.data.data.allProjects.projects;

    assert.equal(projects[0].id, project3.id);
    assert.equal(projects[1].id, project2.id);
    assert.equal(projects[2].id, project1.id);

    assert.equal(projects[0].projectPower.powerRank, 1);
    assert.equal(projects[1].projectPower.powerRank, 2);
    assert.equal(projects[2].projectPower.powerRank, 3);
    assert.equal(projects[3].projectPower.powerRank, 4);

    result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.GIVPower,
      },
    });

    projects = result.data.data.allProjects.projects;
    const totalCount = projects.length;
    for (let i = 1; i < totalCount - 1; i++) {
      assert.isTrue(
        projects[i].projectPower.totalPower <=
          projects[i - 1].projectPower.totalPower,
      );
      assert.isTrue(
        projects[i].projectPower.powerRank >=
          projects[i - 1].projectPower.powerRank,
      );

      if (projects[i].verified === true) {
        // verified project come first
        assert.isTrue(projects[i - 1].verified);
      }
    }
  });

  it('should return projects, filtered by sub category', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      categories: ['food5'],
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        category: 'food5',
      },
    });
    assert.isNotEmpty(result.data.data.allProjects.projects);
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.categories.find(category => category.name === 'food5'),
      );
    });
  });
  it('should return projects, filtered by main category', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      categories: ['drink2'],
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        mainCategory: 'drink',
      },
    });
    assert.isNotEmpty(result.data.data.allProjects.projects);
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.categories.find(
          category => category.mainCategory.title === 'drink',
        ),
      );
    });
  });
  it('should return projects, filtered by main category and sub category at the same time', async () => {
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      categories: ['drink2'],
    });
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      categories: ['drink3'],
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        mainCategory: 'drink',
        category: 'drink3',
      },
    });
    assert.isNotEmpty(result.data.data.allProjects.projects);
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.categories.find(
          category => category.mainCategory.title === 'drink',
        ),
      );

      // Should not return projects with drink2 category
      assert.isOk(
        project.categories.find(category => category.name === 'drink3'),
      );
    });
  });

  it('should return projects, filter by accept donation on gnosis, not return when it doesnt have gnosis address', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const gnosisAddress = (await findProjectRecipientAddressByNetworkId({
      projectId: savedProject.id,
      networkId: NETWORK_IDS.XDAI,
    })) as ProjectAddress;
    gnosisAddress.isRecipient = false;
    await gnosisAddress.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnGnosis'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            address.networkId === NETWORK_IDS.XDAI,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept donation on gnosis, return all addresses', async () => {
    await redis.flushall(); // clear cache from other tests
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnGnosis'],
        sortingBy: SortingField.Newest,
        limit: 50,
      },
    });
    result.data.data.allProjects.projects.forEach(item => {
      assert.isOk(
        item.addresses.find(
          address =>
            address.isRecipient === true &&
            address.networkId === NETWORK_IDS.XDAI,
        ),
      );
    });
    const project = result.data.data.allProjects.projects.find(
      item => Number(item.id) === Number(savedProject.id),
    );

    assert.isOk(project);
    assert.isOk(
      project.addresses.find(
        address =>
          address.isRecipient === true &&
          address.networkId === NETWORK_IDS.XDAI,
      ),
    );
    assert.isOk(
      project.addresses.find(
        address =>
          address.isRecipient === true &&
          address.networkId === NETWORK_IDS.MAIN_NET,
      ),
    );
  });
  it('should return projects, filter by accept donation on gnosis, should not return if it has no address', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    await ProjectAddress.query(`
        DELETE from project_address
        WHERE "projectId"=${savedProject.id}
       `);
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnGnosis'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            address.networkId === NETWORK_IDS.XDAI,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by campaignSlug and limit, skip', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const project3 = await saveProjectDirectlyToDb({
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
      relatedProjectsSlugs: [
        project1.slug as string,
        project2.slug as string,
        project3.slug as string,
      ],
      order: 1,
    }).save();

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit: 1,
        skip: 1,
        campaignSlug: campaign.slug,
      },
    });

    assert.equal(result.data.data.allProjects.projects.length, 1);
    assert.equal(result.data.data.allProjects.campaign.title, campaign.title);
    assert.isOk(
      [project1.slug, project2.slug, project3.slug].includes(
        result.data.data.allProjects.projects[0].slug,
      ),
    );

    await campaign.remove();
  });
}

function projectsByUserIdTestCases() {
  it('should return projects with verificationForm if userId is same as logged in user', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      admin: String(user.id),
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
      project => Number(project.admin) !== user!.id,
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
      project => Number(project.admin) !== userId,
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

  it('should not return draft projects', async () => {
    const take = 1;
    const userId = SEED_DATA.FIRST_USER.id;
    const draftProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
      listed: false,
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
  it('Create Project should return <<Access denied>>, calling without token IN ENGLISH when no-lang header is sent', async () => {
    const sampleProject = {
      title: 'title1',
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
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
  });
  it('Should get error, when sending more thant two recipient address', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [
        SEED_DATA.FOOD_SUB_CATEGORIES[0],
        SEED_DATA.FOOD_SUB_CATEGORIES[1],
      ],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
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
      errorMessages.IT_SHOULD_HAVE_ONE_OR_TWO_ADDRESSES_FOR_RECIPIENT,
    );
  });
  it('Should get error, when walletAddress of project is repetitive', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
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
      `Eth address ${SEED_DATA.FIRST_PROJECT.walletAddress} is already being used for a project`,
    );
  });
  it('should create project when walletAddress of project is a smart contract address', async () => {
    const sampleProject: CreateProjectInput = {
      title: String(new Date().getTime()),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
  it('Should create successfully', async () => {
    const sampleProject: CreateProjectInput = {
      title: 'title ' + new Date().getTime(),
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      admin: String(SEED_DATA.FIRST_USER.id),
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
  });
  it('Should create successfully with special characters in title', async () => {
    const titleWithoutSpecialCharacters = 'title-_' + new Date().getTime();
    const sampleProject: CreateProjectInput = {
      title: titleWithoutSpecialCharacters + `?!@#$%^&*+=.|/<">'` + '`',
      categories: [SEED_DATA.FOOD_SUB_CATEGORIES[0]],
      description: 'description',
      image:
        'https://gateway.pinata.cloud/ipfs/QmauSzWacQJ9rPkPJgr3J3pdgfNRGAaDCr1yAToVWev2QS',
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      result.data.data.createProject.admin,
      String(SEED_DATA.FIRST_USER.id),
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
  it('Should get error when project not found', async () => {
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
      `Eth address ${SEED_DATA.SECOND_PROJECT.walletAddress} is already being used for a project`,
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
  it('Should update addresses successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
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
            title: `test title update addresses`,
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
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[0].address,
      newWalletAddress,
    );
  });
  it('Should update addresses with two addresses successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
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
      editProjectResult.data.data.updateProject.addresses[1].address,
      newWalletAddress2,
    );
    assert.equal(
      editProjectResult.data.data.updateProject.addresses[1].networkId,
      NETWORK_IDS.MAIN_NET,
    );
  });
  it('Should update addresses with current addresses successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const walletAddress = generateRandomEtheriumAddress();

    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
      walletAddress,
    });
    const newWalletAddress = project.walletAddress;

    const queriedAddress0 = await findAllRelatedAddressByWalletAddress(
      walletAddress,
    );

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
      admin: String(user.id),
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
  it('Should throw error when sending three address', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
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
    assert.equal(
      editProjectResult.data.errors[0].message,
      errorMessages.IT_SHOULD_HAVE_ONE_OR_TWO_ADDRESSES_FOR_RECIPIENT,
    );
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(SEED_DATA.FIRST_USER.id),
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
      admin: String(user.id),
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
  });
  it('Should update successfully listed (false) should becomes null', async () => {
    const accessToken = await generateTestAccessToken(SEED_DATA.FIRST_USER.id);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
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
  it('Should get error when project not found', async () => {
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

  it('Should deactivate project successfully, wont affect listed(true)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
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
    assert.isTrue(updatedProject?.listed);
  });

  it('Should deactivate project successfully, wont affect listed(false)', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
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
  it('Should get error when project not found', async () => {
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
  });

  it('Should activate project successfully,  should change listed from false to null', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: false,
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
    assert.isNotEmpty(projects[0]?.addresses);
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
      `Eth address ${SEED_DATA.FIRST_PROJECT.walletAddress} is already being used for a project`,
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
      `Eth address ${upperCaseWalletAddress} is already being used for a project`,
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
      `Eth address ${lowerCaseWalletAddress} is already being used for a project`,
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
      admin: String(user.id),
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
      admin: String(user.id),
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

function projectUpdatesTestCases() {
  it('should return all project updates limited by take and ordered by craetedAt desc', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const project2 = await saveProjectDirectlyToDb({
      ...createProjectData(),
    });
    const user = await User.findOne({
      where: {
        id: SEED_DATA.FIRST_USER.id,
      },
    });

    const projectUpdate1 = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project.id,
      content: 'TestProjectUpdate1',
      title: 'testEditProjectUpdate1',
      createdAt: new Date(),
      isMain: false,
    }).save();
    const projectUpdate2 = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project2.id,
      content: 'TestProjectUpdate2',
      title: 'testEditProjectUpdate2',
      createdAt: new Date(),
      isMain: false,
    }).save();
    const projectUpdate3 = await ProjectUpdate.create({
      userId: user!.id,
      projectId: project2.id,
      content: 'TestProjectUpdateExcluded',
      title: 'testEditProjectUpdateExcluded',
      createdAt: new Date(),
      isMain: false,
    }).save();

    const take = 3; // there are other previously created updates
    const result = await axios.post(graphqlUrl, {
      query: fetchLatestProjectUpdates,
      variables: {
        take,
      },
    });

    assert.isOk(result);
    const data = result.data.data.projectUpdates.projectUpdates;
    // assert only project's most recent updates are returned
    assert.equal(data.length, 3);
    for (const pu of data) {
      assert.isTrue(
        pu.id === projectUpdate1.id ||
          pu.id === projectUpdate3.id ||
          pu.id !== projectUpdate2.id,
      );
    }
    // Assert ordered (which matches order of creation) and project data present
    assert.isTrue(new Date(data[0].createdAt) > new Date(data[1].createdAt));
    assert.isOk(data[0].project.slug);
    assert.equal(data[0].project.slug, project2.slug);
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
    const projectUpdates: ProjectUpdate[] = result.data.data.getProjectUpdates;

    const likedProject = projectUpdates.find(
      pu => +pu.id === PROJECT_UPDATE_SEED_DATA.FIRST_PROJECT_UPDATE.id,
    );
    const noLikedProject = projectUpdates.find(
      pu => +pu.id !== PROJECT_UPDATE_SEED_DATA.FIRST_PROJECT_UPDATE.id,
    );

    // assert.equal(
    //   likedProject?.reaction?.id,
    //   REACTION_SEED_DATA.FIRST_LIKED_PROJECT_UPDATE_REACTION.id,
    // );
    // assert.isNull(noLikedProject?.reaction);
  });
}

function projectBySlugTestCases() {
  it('should return projects with indicated slug and verification form if owner', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const user = (await User.findOne({
      where: {
        id: Number(project1.admin),
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
        query: fetchProjectsBySlugQuery,
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
    assert.isOk(project.projectVerificationForm);
    assert.equal(project.projectVerificationForm.id, verificationForm.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
    assert.isOk(project.categories[0].mainCategory.title);
  });
  it('should return verificationFormStatus if its not owner', async () => {
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const user =
      (await User.findOne({
        where: {
          id: Number(project1.admin),
        },
      })) || undefined;

    const verificationForm = await ProjectVerificationForm.create({
      project: project1,
      user,
      status: PROJECT_VERIFICATION_STATUSES.DRAFT,
    }).save();

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectsBySlugQuery,
      variables: {
        slug: project1.slug,
        connectedWalletUserId: user!.id,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);
    assert.isNotOk(project.projectVerificationForm);
    assert.equal(project.verificationFormStatus, verificationForm.status);
  });

  it('should return projects with indicated slug', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      walletAddress,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectsBySlugQuery,
      variables: {
        slug: project1.slug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);
    assert.isOk(project.adminUser.walletAddress);
    assert.isNull(project.projectVerificationForm);
    assert.isOk(project.adminUser.firstName);
    assert.isNotOk(project.adminUser.email);
    assert.isNotEmpty(project.addresses);
    assert.equal(project.addresses[0].address, walletAddress);
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
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 200,
    });

    await setPowerRound(roundNumber);

    await refreshProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: fetchProjectsBySlugQuery,
      variables: {
        slug: project1.slug,
      },
    });

    const project = result.data.data.projectBySlug;
    assert.equal(Number(project.id), project1.id);

    assert.exists(project.projectPower);
    assert.isTrue(project.projectPower.totalPower > 0);
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
    let incompleteSnapshots = await findInCompletePowerSnapShots();
    let snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
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
    incompleteSnapshots = await findInCompletePowerSnapShots();
    snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 2;
    // Set next round for filling future power rank
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();
    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 200,
    });

    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();
    await refreshProjectPowerView();
    await refreshProjectFuturePowerView();

    const result = await axios.post(graphqlUrl, {
      query: fetchProjectsBySlugQuery,
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
    let incompleteSnapshots = await findInCompletePowerSnapShots();
    let snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
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
    incompleteSnapshots = await findInCompletePowerSnapShots();
    snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 2;
    // Set next round for filling future power rank
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();
    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 0,
    });

    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();
    await refreshProjectPowerView();
    await refreshProjectFuturePowerView(false);

    let result = await axios.post(graphqlUrl, {
      query: fetchProjectsBySlugQuery,
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
      query: fetchProjectsBySlugQuery,
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
      query: fetchProjectsBySlugQuery,
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
        query: fetchProjectsBySlugQuery,
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
        query: fetchProjectsBySlugQuery,
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
      query: fetchProjectsBySlugQuery,
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
        query: fetchProjectsBySlugQuery,
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
        query: fetchProjectsBySlugQuery,
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
    const [_, relatedCount] = await Project.createQueryBuilder('project')
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

    const [_, relatedCount] = await Project.createQueryBuilder('project')
      .innerJoinAndSelect('project.categories', 'categories')
      .where('project.id != :id', { id: viewedProject?.id })
      .andWhere('project.admin = :ownerId', {
        ownerId: String(SEED_DATA.FIRST_USER.id),
      })
      .andWhere(
        `project.statusId = ${ProjStatus.active} AND project.listed = true`,
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
      admin: String(user.id),
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
  it('should can not add project update because of ownerShip ', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      admin: String(user.id),
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
      admin: String(user.id),
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
          content: 'TestProjectUpdateAfterUpdateFateme',
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
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const projectUpdateCount = await ProjectUpdate.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: editProjectUpdateQuery,
        variables: {
          updateId: Number(projectUpdateCount + 1),
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
      admin: String(user.id),
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
      admin: String(user.id),
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
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const projectUpdateCount = await ProjectUpdate.count();
    const result = await axios.post(
      graphqlUrl,
      {
        query: deleteProjectUpdateQuery,
        variables: {
          updateId: Number(projectUpdateCount + 2),
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
