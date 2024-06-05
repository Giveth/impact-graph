import { assert } from 'chai';
import 'mocha';
import axios from 'axios';
import moment from 'moment';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomSolanaAddress,
  graphqlUrl,
  REACTION_SEED_DATA,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { fetchMultiFilterAllProjectsQuery } from '../../test/graphqlQueries';
import { Project, ReviewStatus, SortingField } from '../entities/project';
import { User } from '../entities/user';
import { NETWORK_IDS } from '../provider';
import { findProjectRecipientAddressByNetworkId } from '../repositories/projectAddressRepository';
import { setPowerRound } from '../repositories/powerRoundRepository';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from '../repositories/powerBoostingRepository';
import { refreshProjectPowerView } from '../repositories/projectPowerViewRepository';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { ProjectAddress } from '../entities/projectAddress';
import { PowerBoosting } from '../entities/powerBoosting';
import { AppDataSource } from '../orm';
// We are using cache so redis needs to be cleared for tests with same filters
import { redis } from '../redis';
import { Campaign, CampaignType } from '../entities/campaign';
import { generateRandomString, getHtmlTextSummary } from '../utils/utils';
import { InstantPowerBalance } from '../entities/instantPowerBalance';
import { saveOrUpdateInstantPowerBalances } from '../repositories/instantBoostingRepository';
import { updateInstantBoosting } from '../services/instantBoostingServices';
import { QfRound } from '../entities/qfRound';
import { calculateEstimatedMatchingWithParams } from '../utils/qfUtils';
import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService';
import { addOrUpdatePowerSnapshotBalances } from '../repositories/powerBalanceSnapshotRepository';
import { findPowerSnapshots } from '../repositories/powerSnapshotRepository';
import { ChainType } from '../types/network';

// search and filters
describe('all projects test cases --->', allProjectsTestCases);

function allProjectsTestCases() {
  it('should return projects search by title', async () => {
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        searchTerm: SEED_DATA.FIRST_PROJECT.title,
      },
    });

    const projects = result.data.data.allProjects.projects;

    assert.isTrue(projects.length > 0);
    assert.equal(projects[0]?.adminUserId, SEED_DATA.FIRST_PROJECT.adminUserId);
    assert.isNotEmpty(projects[0].addresses);
    projects.forEach(project => {
      assert.isNotOk(project.adminUser.email);
      assert.isOk(project.adminUser.firstName);
      assert.isOk(project.adminUser.walletAddress);
      assert.isOk(project.categories[0].mainCategory.title);
      assert.equal(
        project.descriptionSummary,
        getHtmlTextSummary(project.description),
      );
      assert.isNull(project.estimatedMatching);
      assert.isNull(project.sumDonationValueUsd);
      assert.isNull(project.sumDonationValueUsdForActiveQfRound);
      assert.isNull(project.countUniqueDonorsForActiveQfRound);
      assert.isNull(project.countUniqueDonors);
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
        searchTerm: SEED_DATA.FIRST_PROJECT.title,
        connectedWalletUserId: USER_DATA.id,
      },
    });

    projects = result.data.data.allProjects.projects;
    // Find the project with the exact title
    const selectedProject = projects.find(
      ({ title }) => title === SEED_DATA.FIRST_PROJECT.title,
    );
    assert.isAtLeast(projects.length, limit);
    assert.equal(
      selectedProject?.reaction?.id,
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
    await saveProjectDirectlyToDb({
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

  // it('should return projects, sort by project raised funds in the active QF round DESC', async () => {
  //   const donor = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  //   const project1 = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     title: String(new Date().getTime()),
  //     slug: String(new Date().getTime()),
  //   });
  //   const project2 = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     title: String(new Date().getTime()),
  //     slug: String(new Date().getTime()),
  //   });

  //   const qfRound = await QfRound.create({
  //     isActive: true,
  //     name: 'test filter by qfRoundId',
  //     minimumPassportScore: 10,
  //     allocatedFund: 100,
  //     beginDate: new Date(),
  //     endDate: moment().add(1, 'day').toDate(),
  //   }).save();
  //   project1.qfRounds = [qfRound];
  //   await project1.save();
  //   project2.qfRounds = [qfRound];
  //   await project2.save();

  //   const donation1 = await saveDonationDirectlyToDb(
  //     {
  //       ...createDonationData(),
  //       status: 'verified',
  //       qfRoundId: qfRound.id,
  //       valueUsd: 2,
  //     },
  //     donor.id,
  //     project1.id,
  //   );

  //   const donation2 = await saveDonationDirectlyToDb(
  //     {
  //       ...createDonationData(),
  //       status: 'verified',
  //       qfRoundId: qfRound.id,
  //       valueUsd: 20,
  //     },
  //     donor.id,
  //     project2.id,
  //   );

  //   await refreshProjectEstimatedMatchingView();

  //   const result = await axios.post(graphqlUrl, {
  //     query: fetchMultiFilterAllProjectsQuery,
  //     variables: {
  //       sortingBy: SortingField.ActiveQfRoundRaisedFunds,
  //       limit: 10,
  //     },
  //   });

  //   assert.equal(result.data.data.allProjects.projects.length, 2);
  //   assert.equal(result.data.data.allProjects.projects[0].id, project2.id);
  //   result.data.data.allProjects.projects.forEach(project => {
  //     assert.equal(project.qfRounds[0].id, qfRound.id);
  //   });
  //   qfRound.isActive = false;
  //   await qfRound.save();
  // });

  it('should return projects, sort by project instant power DESC', async () => {
    await PowerBoosting.clear();
    await InstantPowerBalance.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());
    const project4 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    }); // Not boosted -Not verified project
    await saveProjectDirectlyToDb(createProjectData()); // Not boosted project

    await Promise.all(
      [
        [user1, project1, 10],
        [user1, project2, 20],
        [user1, project3, 30],
        [user1, project4, 40],
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

    let result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.InstantBoosting,
        limit: 50,
      },
    });

    let projects = result.data.data.allProjects.projects;

    assert.equal(projects[0].id, project3.id);
    assert.equal(projects[1].id, project2.id);
    assert.equal(projects[2].id, project1.id);

    assert.equal(projects[0].projectInstantPower.powerRank, 1);
    assert.equal(projects[1].projectInstantPower.powerRank, 2);
    assert.equal(projects[2].projectInstantPower.powerRank, 3);
    assert.equal(projects[3].projectInstantPower.powerRank, 4);

    result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        sortingBy: SortingField.InstantBoosting,
      },
    });

    projects = result.data.data.allProjects.projects;
    const totalCount = projects.length;
    for (let i = 1; i < totalCount - 1; i++) {
      assert.isTrue(
        projects[i].projectInstantPower.totalPower <=
          projects[i - 1].projectInstantPower.totalPower,
      );
      assert.isTrue(
        projects[i].projectInstantPower.powerRank >=
          projects[i - 1].projectInstantPower.powerRank,
      );

      if (projects[i].verified === true) {
        // verified project come first
        assert.isTrue(projects[i - 1].verified);
      }
    }
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
    await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    }); // Not boosted -Not verified project
    await saveProjectDirectlyToDb(createProjectData()); // Not boosted project

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
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: user1.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
      {
        userId: user2.id,
        powerSnapshotId: snapshot.id,
        balance: 20000,
      },
    ]);

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
            address.networkId === NETWORK_IDS.XDAI &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on celo', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.CELO,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnCelo'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.CELO ||
              address.networkId === NETWORK_IDS.CELO_ALFAJORES),
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept donation on celo', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.CELO,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnCelo'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.CELO ||
              address.networkId === NETWORK_IDS.CELO_ALFAJORES) &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on celo, not return when it doesnt have celo address', async () => {
    const celoProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.CELO,
    });
    const polygonProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.POLYGON,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnCelo'],
        sortingBy: SortingField.Newest,
      },
    });

    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.CELO ||
              address.networkId === NETWORK_IDS.CELO_ALFAJORES) &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(polygonProject.id),
      ),
    );
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(celoProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on arbitrum', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.ARBITRUM_MAINNET,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnArbitrum'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.ARBITRUM_MAINNET ||
              address.networkId === NETWORK_IDS.ARBITRUM_SEPOLIA),
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept donation on arbitrum', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.ARBITRUM_MAINNET,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnArbitrum'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.ARBITRUM_MAINNET ||
              address.networkId === NETWORK_IDS.ARBITRUM_SEPOLIA) &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept donation on arbitrum, not return when it doesnt have arbitrum address', async () => {
    const arbitrumProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.ARBITRUM_MAINNET,
    });
    const polygonProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.POLYGON,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnArbitrum'],
        sortingBy: SortingField.Newest,
      },
    });

    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.ARBITRUM_MAINNET ||
              address.networkId === NETWORK_IDS.ARBITRUM_SEPOLIA) &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(polygonProject.id),
      ),
    );
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(arbitrumProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on base', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.BASE_MAINNET,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnBase'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.BASE_MAINNET ||
              address.networkId === NETWORK_IDS.BASE_SEPOLIA),
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept donation on base', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.BASE_MAINNET,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnBase'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.BASE_MAINNET ||
              address.networkId === NETWORK_IDS.BASE_SEPOLIA) &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept donation on base, not return when it doesnt have base address', async () => {
    const baseProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.BASE_MAINNET,
    });
    const polygonProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.POLYGON,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnBase'],
        sortingBy: SortingField.Newest,
      },
    });

    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.BASE_MAINNET ||
              address.networkId === NETWORK_IDS.BASE_SEPOLIA) &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(polygonProject.id),
      ),
    );
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(baseProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on mainnet', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.MAIN_NET,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnMainnet'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.MAIN_NET ||
              address.networkId === NETWORK_IDS.GOERLI) &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on mainnet, not return when it doesnt have mainnet address', async () => {
    const polygonProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.POLYGON,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnMainnet'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            address.networkId === NETWORK_IDS.MAIN_NET &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(polygonProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on polygon', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const polygonAddress = (await findProjectRecipientAddressByNetworkId({
      projectId: savedProject.id,
      networkId: NETWORK_IDS.POLYGON,
    })) as ProjectAddress;
    polygonAddress.isRecipient = true;
    await polygonAddress.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnPolygon'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            address.networkId === NETWORK_IDS.POLYGON &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on polygon, not return when it doesnt have polygon address', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.OPTIMISTIC,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnPolygon'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            address.networkId === NETWORK_IDS.POLYGON &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on GOERLI', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.GOERLI,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnMainnet'],
        sortingBy: SortingField.Newest,
        limit: 50,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            (address.isRecipient === true &&
              address.networkId === NETWORK_IDS.MAIN_NET) ||
            address.networkId === NETWORK_IDS.GOERLI,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on ALFAJORES', async () => {
    const alfajoresProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.CELO_ALFAJORES,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnCelo'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            (address.isRecipient === true &&
              // We return both Celo and Alfajores when sending AcceptFundOnCelo filter
              address.networkId === NETWORK_IDS.CELO_ALFAJORES) ||
            address.networkId === NETWORK_IDS.CELO,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(alfajoresProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on Arbitrum Sepolia', async () => {
    const arbSepoliaProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.ARBITRUM_SEPOLIA,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnArbitrum'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            (address.isRecipient === true &&
              // We return both Arbitrum Mainnet and Arbitrum Sepolia when sending AcceptFundOnArbitrum filter
              address.networkId === NETWORK_IDS.ARBITRUM_SEPOLIA) ||
            address.networkId === NETWORK_IDS.ARBITRUM_MAINNET,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(arbSepoliaProject.id),
      ),
    );
  });

  it('should return projects, filter by accept donation on optimism', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.OPTIMISTIC,
    });
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnOptimism'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            address.networkId === NETWORK_IDS.OPTIMISTIC &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept donation on optimism, not return when it doesnt have optimism address', async () => {
    const gnosisProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      networkId: NETWORK_IDS.XDAI,
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnOptimism'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            (address.networkId === NETWORK_IDS.OPTIMISTIC ||
              address.networkId === NETWORK_IDS.OPTIMISM_SEPOLIA) &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(gnosisProject.id),
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
            address.networkId === NETWORK_IDS.XDAI &&
            address.chainType === ChainType.EVM,
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
          address.networkId === NETWORK_IDS.XDAI &&
          address.chainType === ChainType.EVM,
      ),
    );
    assert.isOk(
      project.addresses.find(
        address =>
          address.isRecipient === true &&
          address.networkId === NETWORK_IDS.MAIN_NET &&
          address.chainType === ChainType.EVM,
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
        DELETE
        from project_address
        WHERE "projectId" = ${savedProject.id}
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
            address.networkId === NETWORK_IDS.XDAI &&
            address.chainType === ChainType.EVM,
        ),
      );
    });
    assert.isNotOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept donation on Solana', async () => {
    const savedProject = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    await ProjectAddress.delete({ projectId: savedProject.id });
    const solanaAddress = ProjectAddress.create({
      project: savedProject,
      title: 'first address',
      address: generateRandomSolanaAddress(),
      chainType: ChainType.SOLANA,
      networkId: 0,
      isRecipient: true,
    });
    await solanaAddress.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnSolana'],
        sortingBy: SortingField.Newest,
      },
    });
    result.data.data.allProjects.projects.forEach(project => {
      assert.isOk(
        project.addresses.find(
          address =>
            address.isRecipient === true &&
            address.chainType === ChainType.SOLANA,
        ),
      );
    });
    assert.isOk(
      result.data.data.allProjects.projects.find(
        project => Number(project.id) === Number(savedProject.id),
      ),
    );
  });
  it('should return projects, filter by accept fund on two Ethereum networks', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const mainnetAddress = ProjectAddress.create({
      project,
      title: 'first address',
      address: generateRandomEtheriumAddress(),
      networkId: 1,
      isRecipient: true,
    });
    await mainnetAddress.save();

    const solanaAddress = ProjectAddress.create({
      project,
      title: 'secnod address',
      address: generateRandomSolanaAddress(),
      chainType: ChainType.SOLANA,
      networkId: 0,
      isRecipient: true,
    });
    await solanaAddress.save();

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnMainnet', 'AcceptFundOnSolana'],
        sortingBy: SortingField.Newest,
      },
    });
    const { projects } = result.data.data.allProjects;

    const projectIds = projects.map(_project => _project.id);
    assert.include(projectIds, String(project.id));
  });
  it('should return projects, when only accpets donation on Solana or an expected Ethereum network', async () => {
    const projectWithMainnet = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });
    const projectWithSolana = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const mainnetAddress = ProjectAddress.create({
      project: projectWithMainnet,
      title: 'first address',
      address: generateRandomEtheriumAddress(),
      networkId: 1,
      isRecipient: true,
    });
    await mainnetAddress.save();

    const solanaAddress = ProjectAddress.create({
      project: projectWithSolana,
      title: 'secnod address',
      address: generateRandomSolanaAddress(),
      chainType: ChainType.SOLANA,
      networkId: 0,
      isRecipient: true,
    });
    await solanaAddress.save();

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnMainnet', 'AcceptFundOnSolana'],
        sortingBy: SortingField.Newest,
      },
    });
    const { projects } = result.data.data.allProjects;
    const projectIds = projects.map(project => project.id);
    assert.include(projectIds, String(projectWithMainnet.id));
    assert.include(projectIds, String(projectWithSolana.id));
  });
  it('should not return a project when it does not accept donation on Solana', async () => {
    // Delete all project addresses
    await ProjectAddress.delete({ chainType: ChainType.SOLANA });

    await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
    });

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        filters: ['AcceptFundOnSolana'],
        sortingBy: SortingField.Newest,
      },
    });
    const { projects } = result.data.data.allProjects;
    assert.lengthOf(projects, 0);
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
  it('should return projects, filter by qfRoundId', async () => {
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

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test filter by qfRoundId',
      slug: new Date().getTime().toString(),
      minimumPassportScore: 10,
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project1.qfRounds = [qfRound];
    await project1.save();
    project2.qfRounds = [qfRound];
    await project2.save();
    project3.qfRounds = [qfRound];
    await project3.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        qfRoundId: qfRound.id,
      },
    });

    assert.equal(result.data.data.allProjects.projects.length, 3);
    result.data.data.allProjects.projects.forEach(project => {
      assert.equal(project.qfRounds[0].id, qfRound.id);
    });
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return projects, filter by qfRoundSlug', async () => {
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

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test filter by qfRoundId',
      slug: new Date().getTime().toString(),
      minimumPassportScore: 10,
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project1.qfRounds = [qfRound];
    await project1.save();
    project2.qfRounds = [qfRound];
    await project2.save();
    project3.qfRounds = [qfRound];
    await project3.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        qfRoundSlug: qfRound.slug,
      },
    });

    assert.equal(result.data.data.allProjects.projects.length, 3);
    result.data.data.allProjects.projects.forEach(project => {
      assert.equal(project.qfRounds[0].id, qfRound.id);
    });
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should just return verified projects, filter by qfRoundId and verified', async () => {
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
      verified: false,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test filter by qfRoundId',
      slug: new Date().getTime().toString(),
      minimumPassportScore: 10,
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project1.qfRounds = [qfRound];
    await project1.save();
    project2.qfRounds = [qfRound];
    await project2.save();
    project3.qfRounds = [qfRound];
    await project3.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        qfRoundId: qfRound.id,
        filters: ['Verified'],
      },
    });

    assert.equal(result.data.data.allProjects.projects.length, 2);
    result.data.data.allProjects.projects.forEach(project => {
      assert.equal(project.qfRounds[0].id, qfRound.id);
    });
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return projects, filter by qfRoundId, calculate estimated matching', async () => {
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

    const qfRound = await QfRound.create({
      isActive: true,
      name: new Date().toString(),
      slug: new Date().getTime().toString(),
      minimumPassportScore: 8,
      allocatedFund: 1000,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    project1.qfRounds = [qfRound];
    await project1.save();
    project2.qfRounds = [qfRound];
    await project2.save();

    const donor1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor1.passportScore = 13;
    await donor1.save();

    const donor2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    donor2.passportScore = 13;
    await donor2.save();

    // We should have result similar to https://wtfisqf.com/?grant=2,2&grant=4&grant=&grant=&match=1000
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd: 2,
      },
      donor1.id,
      project1.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd: 2,
      },
      donor2.id,
      project1.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        qfRoundId: qfRound.id,
        valueUsd: 4,
      },
      donor1.id,
      project2.id,
    );

    await refreshProjectEstimatedMatchingView();

    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        qfRoundId: qfRound.id,
      },
    });

    assert.equal(result.data.data.allProjects.projects.length, 2);
    const firstProject = result.data.data.allProjects.projects.find(
      p => Number(p.id) === project1.id,
    );
    const secondProject = result.data.data.allProjects.projects.find(
      p => Number(p.id) === project2.id,
    );

    const project1EstimatedMatching =
      await calculateEstimatedMatchingWithParams({
        matchingPool: firstProject.estimatedMatching.matchingPool,
        projectDonationsSqrtRootSum:
          firstProject.estimatedMatching.projectDonationsSqrtRootSum,
        allProjectsSum: firstProject.estimatedMatching.allProjectsSum,
      });

    const project2EstimatedMatching =
      await calculateEstimatedMatchingWithParams({
        matchingPool: secondProject.estimatedMatching.matchingPool,
        projectDonationsSqrtRootSum:
          secondProject.estimatedMatching.projectDonationsSqrtRootSum,
        allProjectsSum: secondProject.estimatedMatching.allProjectsSum,
      });

    assert.equal(Math.floor(project1EstimatedMatching), 666);
    assert.equal(Math.floor(project2EstimatedMatching), 333);
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return projects, filter by ActiveQfRound', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      slug: new Date().getTime().toString(),
      minimumPassportScore: 10,
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit: 50,
        skip: 0,
        filters: ['ActiveQfRound'],
      },
    });
    assert.equal(result.data.data.allProjects.projects.length, 1);
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return projects, filter by ActiveQfRound, and not return non verified projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: false,
      listed: true,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      slug: new Date().getTime().toString(),
      minimumPassportScore: 10,
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit: 50,
        skip: 0,
        filters: ['ActiveQfRound', 'Verified'],
      },
    });
    assert.equal(result.data.data.allProjects.projects.length, 0);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return projects, filter by ActiveQfRound, and not return non listed projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: false,
      reviewStatus: ReviewStatus.NotListed,
    });

    const qfRound = await QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      slug: new Date().getTime().toString(),
      minimumPassportScore: 10,
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit: 50,
        skip: 0,
        filters: ['ActiveQfRound', 'Verified'],
      },
    });
    assert.equal(result.data.data.allProjects.projects.length, 0);
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return empty list when qfRound is not active, filter by ActiveQfRound', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      title: String(new Date().getTime()),
      slug: String(new Date().getTime()),
      verified: true,
      listed: true,
    });

    const qfRound = await QfRound.create({
      isActive: false,
      name: 'test2',
      allocatedFund: 100,
      slug: new Date().getTime().toString(),
      minimumPassportScore: 10,
      beginDate: new Date(),
      endDate: new Date(),
    }).save();
    project.qfRounds = [qfRound];
    await project.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchMultiFilterAllProjectsQuery,
      variables: {
        limit: 50,
        skip: 0,
        filters: ['ActiveQfRound'],
      },
    });

    assert.equal(result.data.data.allProjects.projects.length, 0);
    qfRound.isActive = false;
    await qfRound.save();
  });
}
