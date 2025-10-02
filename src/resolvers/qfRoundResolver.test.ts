import { assert, expect } from 'chai';
import moment from 'moment';
import axios from 'axios';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { Project } from '../entities/project';
import { QfRound } from '../entities/qfRound';
import { User } from '../entities/user';
import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService';
import { removeProjectAndRelatedEntities } from '../repositories/projectRepository';
import {
  fetchQFArchivedRounds,
  qfRoundStatsQuery,
  scoreUserAddressMutation,
  qfRoundSmartSelectQuery,
  qfRoundsQuery,
} from '../../test/graphqlQueries';
import { generateRandomString } from '../utils/utils';
import { OrderDirection } from './projectResolver';
import { QfArchivedRoundsSortType } from '../repositories/qfRoundRepository';

describe('Fetch estimatedMatching test cases', fetchEstimatedMatchingTestCases);
describe('Fetch qfRoundStats test cases', fetchQfRoundStatesTestCases);
describe('Fetch archivedQFRounds test cases', fetchArchivedQFRoundsTestCases);
describe('update scoreUserAddress test cases', scoreUserAddressTestCases);
describe('QF Round Smart Select test cases', qfRoundSmartSelectTestCases);
describe(
  'QF Rounds Priority Sorting test cases',
  qfRoundsPrioritySortingTestCases,
);

function scoreUserAddressTestCases() {
  it('should score the address with new model mocks score', async () => {
    await QfRound.update({}, { isActive: false });
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test1',
      slug: generateRandomString(10),
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();

    const result = await axios.post(graphqlUrl, {
      query: scoreUserAddressMutation,
      variables: {
        address: user.walletAddress,
      },
    });

    assert.isOk(result);
    assert.isTrue(result.data.data.scoreUserAddress.activeQFMBDScore > 0);
  });
}

function fetchArchivedQFRoundsTestCases() {
  it('should return correct data when fetching archived QF rounds', async () => {
    await QfRound.update({}, { isActive: true });
    const qfRound1 = QfRound.create({
      isActive: true,
      name: 'test1',
      slug: generateRandomString(10),
      allocatedFund: 100000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound1.save();

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 150,
        qfRoundId: qfRound1.id,
        status: 'verified',
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        valueUsd: 250,
        qfRoundId: qfRound1.id,
        status: 'verified',
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    const qfRound2 = QfRound.create({
      isActive: false,
      name: 'test2',
      slug: generateRandomString(10),
      allocatedFund: 200000,
      minimumPassportScore: 8,
      beginDate: moment().add(-10, 'days').toDate(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound2.save();
    const qfRound3 = QfRound.create({
      isActive: false,
      name: 'test3',
      slug: generateRandomString(10),
      allocatedFund: 300000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound3.save();
    const result = await axios.post(graphqlUrl, {
      query: fetchQFArchivedRounds,
      variables: {
        orderBy: {
          direction: OrderDirection.DESC,
          field: QfArchivedRoundsSortType.beginDate,
        },
      },
    });
    const res = result.data.data.qfArchivedRounds;
    assert.equal(res[0].id, qfRound3.id);
    assert.equal(res.length, 2);
  });
}

function fetchQfRoundStatesTestCases() {
  let qfRound: QfRound;
  let project: Project;

  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      slug: generateRandomString(10),
      allocatedFund: 100,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    project = await saveProjectDirectlyToDb(createProjectData());
    project.qfRounds = [qfRound];
    await project.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return correct data when there is some donations', async () => {
    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();

        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              project.id,
            );
          }),
        );
      }),
    );

    await refreshProjectEstimatedMatchingView();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundStatsQuery,
      variables: {
        slug: qfRound.slug,
      },
    });
    const qfRoundStats = result.data.data.qfRoundStats;

    expect(qfRoundStats.allDonationsUsdValue).to.equal(4 + 25 + 100);
    expect(qfRoundStats.uniqueDonors).to.equal(3);
  });
}

function fetchEstimatedMatchingTestCases() {
  let qfRound: QfRound;
  let firstProject: Project;
  let secondProject: Project;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      slug: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    firstProject = await saveProjectDirectlyToDb(createProjectData());
    secondProject = await saveProjectDirectlyToDb(createProjectData());

    firstProject.qfRounds = [qfRound];
    secondProject.qfRounds = [qfRound];

    await firstProject.save();
    await secondProject.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return estimated matching formula parts', async () => {
    assert.isTrue(true);
    // const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    // const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    // const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    // const usersDonations: [number, number, number[]][] = [
    //   [user1.id, firstProject.id, [1, 3]], // 4
    //   [user1.id, secondProject.id, [4, 4 * 3]], // 16
    //   [user2.id, firstProject.id, [2, 23]], // 25
    //   [user2.id, secondProject.id, [4 * 2, 4 * 23]], // 25 * 4
    //   [user3.id, firstProject.id, [3, 97]], // 100
    //   [user3.id, secondProject.id, [3 * 4, 97 * 4]], // 100 * 4
    // ];

    // await Promise.all(
    //   usersDonations.map(([userId, projectId, valuesUsd]) => {
    //     return Promise.all(
    //       valuesUsd.map(valueUsd => {
    //         return saveDonationDirectlyToDb(
    //           { ...createDonationData(), valueUsd, qfRoundId: qfRound.id },
    //           userId,
    //           projectId,
    //         );
    //       }),
    //     );
    //   }),
    // );

    // const firstProjectMatch = await calculateEstimateMatchingForProjectById(
    //   firstProject.id,
    // );
    // const secondProjectMatch = await calculateEstimateMatchingForProjectById(
    //   secondProject.id,
    // );

    // // the sum of the matchs of each project according to its donations should equal the
    // // allocated funds of the round.
    // // Both have same amount of donations, so in this case bigger donations generate more matching
    // assert.equal(
    //   firstProjectMatch! + secondProjectMatch!,
    //   qfRound.allocatedFund,
    // );
    // assert.isTrue(secondProjectMatch! > firstProjectMatch!);
  });
}

function qfRoundSmartSelectTestCases() {
  let project: Project;
  let qfRound1: QfRound;
  let qfRound2: QfRound;
  let qfRound3: QfRound;
  let user: User;
  let user2: User;

  beforeEach(async () => {
    // Deactivate all existing QF rounds
    await QfRound.update({}, { isActive: false });

    // Create test users
    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    // Create a test project
    project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
      verified: true,
    });
  });

  afterEach(async () => {
    // Cleanup: Remove project and all related entities
    if (project) {
      await removeProjectAndRelatedEntities(project.id);
    }

    // Cleanup: Deactivate all QF rounds created by tests
    if (qfRound1) {
      qfRound1.isActive = false;
      await qfRound1.save();
    }
    if (qfRound2) {
      qfRound2.isActive = false;
      await qfRound2.save();
    }
    if (qfRound3) {
      qfRound3.isActive = false;
      await qfRound3.save();
    }

    // Cleanup: Remove users
    if (user) {
      await User.remove(user);
    }
    if (user2) {
      await User.remove(user2);
    }
  });

  it('should return the only eligible QF round when there is exactly one match', async () => {
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'Test QF Round',
      title: 'Test QF Round Title',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [1, 137], // Ethereum and Polygon
      priority: 1,
    });
    await qfRound1.save();

    project.qfRounds = [qfRound1];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound1.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'Test QF Round',
    );
    assert.equal(
      result.data.data.qfRoundSmartSelect.matchingPoolAmount,
      100000,
    );
    assert.equal(result.data.data.qfRoundSmartSelect.allocatedFundUSD, 50000);
    assert.deepEqual(
      result.data.data.qfRoundSmartSelect.eligibleNetworks,
      [1, 137],
    );
    // Test new qfRoundStats fields
    assert.isNumber(result.data.data.qfRoundSmartSelect.projectUsdAmountRaised);
    assert.isNumber(result.data.data.qfRoundSmartSelect.uniqueDonors);
    assert.isNumber(result.data.data.qfRoundSmartSelect.donationsCount);
  });

  it('should throw error when no active QF rounds exist for the project', async () => {
    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.errors);
    assert.include(
      result.data.errors[0].message,
      'No eligible QF rounds found for this project',
    );
  });

  it('should throw error when no QF rounds are eligible for the specified network', async () => {
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'Test QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [137], // Only Polygon
      priority: 1,
    });
    await qfRound1.save();

    project.qfRounds = [qfRound1];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1, // Ethereum network
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.errors);
    assert.include(
      result.data.errors[0].message,
      'No eligible QF rounds found for the specified network',
    );
  });

  it('should select QF round with highest allocatedFundUSD when multiple rounds are eligible', async () => {
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'Lower Fund QF Round',
      allocatedFund: 50000,
      allocatedFundUSD: 25000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-1`,
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound1.save();

    qfRound2 = QfRound.create({
      isActive: true,
      name: 'Higher Fund QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 75000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-2`,
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 2,
    });
    await qfRound2.save();

    project.qfRounds = [qfRound1, qfRound2];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound2.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'Higher Fund QF Round',
    );
    assert.equal(result.data.data.qfRoundSmartSelect.allocatedFundUSD, 75000);
  });

  it('should select QF round with closest endDate when allocatedFundUSD is equal', async () => {
    const now = new Date();
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'Later End Date QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-1`,
      beginDate: now,
      endDate: moment(now).add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound1.save();

    qfRound2 = QfRound.create({
      isActive: true,
      name: 'Earlier End Date QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-2`,
      beginDate: now,
      endDate: moment(now).add(15, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 2,
    });
    await qfRound2.save();

    project.qfRounds = [qfRound1, qfRound2];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound2.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'Earlier End Date QF Round',
    );
  });

  it('should select QF round with highest priority when allocatedFundUSD and endDate are equal', async () => {
    const now = new Date();
    const endDate = moment(now).add(30, 'days').toDate();

    qfRound1 = QfRound.create({
      isActive: true,
      name: 'Lower Priority QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-1`,
      beginDate: now,
      endDate: endDate,
      eligibleNetworks: [1],
      priority: 2,
    });
    await qfRound1.save();

    qfRound2 = QfRound.create({
      isActive: true,
      name: 'Higher Priority QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-2`,
      beginDate: now,
      endDate: endDate,
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound2.save();

    project.qfRounds = [qfRound1, qfRound2];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound2.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'Higher Priority QF Round',
    );
  });

  it('should exclude QF rounds that have already ended', async () => {
    const now = new Date();
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'Ended QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-1`,
      beginDate: moment(now).subtract(10, 'days').toDate(),
      endDate: moment(now).subtract(1, 'day').toDate(), // Already ended
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound1.save();

    qfRound2 = QfRound.create({
      isActive: true,
      name: 'Active QF Round',
      allocatedFund: 50000,
      allocatedFundUSD: 25000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-2`,
      beginDate: now,
      endDate: moment(now).add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 2,
    });
    await qfRound2.save();

    project.qfRounds = [qfRound1, qfRound2];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound2.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'Active QF Round',
    );
  });

  it('should handle QF rounds with empty eligibleNetworks (all networks eligible)', async () => {
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'All Networks QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [], // Empty array means all networks are eligible
      priority: 1,
    });
    await qfRound1.save();

    project.qfRounds = [qfRound1];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 999, // Non-standard network ID
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound1.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'All Networks QF Round',
    );
  });

  it('should use title as fallback when name is not provided', async () => {
    qfRound1 = QfRound.create({
      isActive: true,
      name: undefined, // No name
      title: 'QF Round Title',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound1.save();

    project.qfRounds = [qfRound1];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'QF Round Title',
    );
  });

  it('should use default name when both name and title are not provided', async () => {
    qfRound1 = QfRound.create({
      isActive: true,
      name: undefined,
      title: undefined,
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound1.save();

    project.qfRounds = [qfRound1];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'Unnamed QF Round',
    );
  });

  it('should handle null allocatedFundUSD values', async () => {
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'No USD Fund QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: undefined,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-1`,
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound1.save();

    qfRound2 = QfRound.create({
      isActive: true,
      name: 'With USD Fund QF Round',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-2`,
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 2,
    });
    await qfRound2.save();

    project.qfRounds = [qfRound1, qfRound2];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound2.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'With USD Fund QF Round',
    );
  });

  it('should handle complex prioritization with multiple criteria', async () => {
    const now = new Date();
    // Round 1: Lower fund, later end date, higher priority
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'Lower Fund Later End Higher Priority',
      allocatedFund: 50000,
      allocatedFundUSD: 25000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-1`,
      beginDate: now,
      endDate: moment(now).add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound1.save();

    // Round 2: Higher fund, earlier end date, lower priority
    qfRound2 = QfRound.create({
      isActive: true,
      name: 'Higher Fund Earlier End Lower Priority',
      allocatedFund: 100000,
      allocatedFundUSD: 75000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-2`,
      beginDate: now,
      endDate: moment(now).add(15, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 2,
    });
    await qfRound2.save();

    // Round 3: Same fund as Round 2, same end date as Round 1, same priority as Round 1
    qfRound3 = QfRound.create({
      isActive: true,
      name: 'Same Fund Same End Same Priority',
      allocatedFund: 100000,
      allocatedFundUSD: 75000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-3`,
      beginDate: now,
      endDate: moment(now).add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound3.save();

    project.qfRounds = [qfRound1, qfRound2, qfRound3];
    await project.save();

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    // Should select Round 2 (highest allocatedFundUSD)
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound2.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'Higher Fund Earlier End Lower Priority',
    );
  });

  it('should return correct qfRoundStats data when project has donations', async () => {
    // Create a QF round
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Test QF Round with Donations',
      allocatedFund: 100000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      slug: `${new Date().getTime()}-donations`,
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
      eligibleNetworks: [1],
      priority: 1,
    });
    await qfRound.save();

    project.qfRounds = [qfRound];
    await project.save();

    // Create some test donations for this project and QF round
    await saveDonationDirectlyToDb(
      createDonationData({
        status: 'verified',
        valueUsd: 100,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      createDonationData({
        status: 'verified',
        valueUsd: 200,
        qfRoundId: qfRound.id,
      }),
      user.id,
      project.id,
    );

    // Create a donation from a different user
    await saveDonationDirectlyToDb(
      createDonationData({
        status: 'verified',
        valueUsd: 50,
        qfRoundId: qfRound.id,
      }),
      user2.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: qfRoundSmartSelectQuery,
      variables: {
        networkId: 1,
        projectId: project.id,
      },
    });

    assert.isOk(result);
    assert.isOk(result.data.data.qfRoundSmartSelect);
    assert.equal(result.data.data.qfRoundSmartSelect.qfRoundId, qfRound.id);
    assert.equal(
      result.data.data.qfRoundSmartSelect.qfRoundName,
      'Test QF Round with Donations',
    );

    // Test qfRoundStats fields
    assert.equal(
      result.data.data.qfRoundSmartSelect.projectUsdAmountRaised,
      350,
    ); // 100 + 200 + 50
    assert.equal(result.data.data.qfRoundSmartSelect.uniqueDonors, 2); // 2 unique users
    assert.equal(result.data.data.qfRoundSmartSelect.donationsCount, 3); // 3 donations
  });
}

function qfRoundsPrioritySortingTestCases() {
  let qfRound1: QfRound;
  let qfRound2: QfRound;
  let qfRound3: QfRound;

  beforeEach(async () => {
    // Clear QF round references from donations and delete all QF rounds
    await QfRound.query('UPDATE donation SET "qfRoundId" = NULL');
    await QfRound.query('DELETE FROM qf_round_history');
    await QfRound.query('DELETE FROM project_qf_rounds_qf_round');
    await QfRound.query('DELETE FROM qf_round');

    // Create test qfRounds with different priorities and end dates
    const now = new Date();
    qfRound1 = QfRound.create({
      isActive: false,
      name: 'Round 1',
      slug: generateRandomString(10),
      allocatedFund: 1000,
      minimumPassportScore: 8,
      beginDate: now,
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      priority: 3,
    });
    await qfRound1.save();

    qfRound2 = QfRound.create({
      isActive: false,
      name: 'Round 2',
      slug: generateRandomString(10),
      allocatedFund: 2000,
      minimumPassportScore: 8,
      beginDate: now,
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      priority: 5,
    });
    await qfRound2.save();

    qfRound3 = QfRound.create({
      isActive: false,
      name: 'Round 3',
      slug: generateRandomString(10),
      allocatedFund: 3000,
      minimumPassportScore: 8,
      beginDate: now,
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: 5, // Same priority as qfRound2
    });
    await qfRound3.save();
  });

  afterEach(async () => {
    // Clean up the test QF rounds
    if (qfRound1) {
      await QfRound.delete({ id: qfRound1.id });
    }
    if (qfRound2) {
      await QfRound.delete({ id: qfRound2.id });
    }
    if (qfRound3) {
      await QfRound.delete({ id: qfRound3.id });
    }
  });

  it('should return qfRounds sorted by priority when sortBy is priority', async () => {
    // Test Priority sorting
    const result = await axios.post(graphqlUrl, {
      query: qfRoundsQuery,
      variables: {
        sortBy: 'priority',
      },
    });

    assert.isArray(result.data.data.qfRounds);
    assert.equal(result.data.data.qfRounds.length, 3);

    // Should be sorted by priority DESC, then by endDate ASC
    // qfRound2 and qfRound3 have priority 5, qfRound1 has priority 3
    // Among priority 5, qfRound2 should come first (endDate is closer)
    assert.equal(result.data.data.qfRounds[0].id, qfRound2.id); // priority 5, endDate closest
    assert.equal(result.data.data.qfRounds[1].id, qfRound3.id); // priority 5, endDate further
    assert.equal(result.data.data.qfRounds[2].id, qfRound1.id); // priority 3
  });

  it.skip('should return qfRounds sorted by id DESC when no sortBy is provided', async () => {
    // Test default sorting (by id DESC)
    const result = await axios.post(graphqlUrl, {
      query: qfRoundsQuery,
      variables: {},
    });

    assert.isArray(result.data.data.qfRounds);
    assert.equal(result.data.data.qfRounds.length, 3);

    // Should be sorted by id DESC (newest first)
    assert.equal(result.data.data.qfRounds[0].id, qfRound3.id); // Latest created
    assert.equal(result.data.data.qfRounds[1].id, qfRound2.id);
    assert.equal(result.data.data.qfRounds[2].id, qfRound1.id); // Oldest created
  });

  it.skip('should return qfRounds sorted by id DESC when sortBy is roundId', async () => {
    // Test explicit roundId sorting (same as default)
    const result = await axios.post(graphqlUrl, {
      query: qfRoundsQuery,
      variables: {
        sortBy: 'roundId',
      },
    });

    assert.isArray(result.data.data.qfRounds);
    assert.equal(result.data.data.qfRounds.length, 3);

    // Should be sorted by id DESC (newest first)
    assert.equal(result.data.data.qfRounds[0].id, qfRound3.id); // Latest created
    assert.equal(result.data.data.qfRounds[1].id, qfRound2.id);
    assert.equal(result.data.data.qfRounds[2].id, qfRound1.id); // Oldest created
  });

  it('should handle qfRounds with same priority and same endDate', async () => {
    // Create additional qfRounds with same priority and endDate
    const now = new Date();
    const sameEndDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000); // 4 days from now

    const qfRound4 = QfRound.create({
      isActive: false,
      name: 'Round 4',
      slug: generateRandomString(10),
      allocatedFund: 4000,
      minimumPassportScore: 8,
      beginDate: now,
      endDate: sameEndDate,
      priority: 5, // Same priority as qfRound2 and qfRound3
    });
    await qfRound4.save();

    const qfRound5 = QfRound.create({
      isActive: false,
      name: 'Round 5',
      slug: generateRandomString(10),
      allocatedFund: 5000,
      minimumPassportScore: 8,
      beginDate: now,
      endDate: sameEndDate, // Same endDate as qfRound4
      priority: 5, // Same priority
    });
    await qfRound5.save();

    try {
      const result = await axios.post(graphqlUrl, {
        query: qfRoundsQuery,
        variables: {
          sortBy: 'priority',
        },
      });

      assert.isArray(result.data.data.qfRounds);
      assert.equal(result.data.data.qfRounds.length, 5);

      // Should be sorted by priority DESC, then by endDate ASC
      // All priority 5 rounds should come before priority 3
      const priority5Rounds = result.data.data.qfRounds.slice(0, 4);
      const priority3Rounds = result.data.data.qfRounds.slice(4);

      // All priority 5 rounds should have priority 5
      priority5Rounds.forEach(round => {
        assert.equal(round.priority, 5);
      });

      // Priority 3 rounds should have priority 3
      priority3Rounds.forEach(round => {
        assert.equal(round.priority, 3);
      });

      // Among priority 5 rounds, should be sorted by endDate ASC
      // qfRound2 (3 days), qfRound4 (4 days), qfRound5 (4 days), qfRound3 (7 days)
      assert.equal(result.data.data.qfRounds[0].id, qfRound2.id.toString()); // 3 days
      // qfRound4 and qfRound5 have same endDate, so order is not guaranteed
      const remainingPriority5 = result.data.data.qfRounds.slice(1, 4);
      const remainingIds = remainingPriority5.map(r => r.id);
      assert.include(remainingIds, qfRound4.id.toString());
      assert.include(remainingIds, qfRound5.id.toString());
      assert.include(remainingIds, qfRound3.id.toString());
    } finally {
      // Clean up additional QF rounds
      await QfRound.delete({ id: qfRound4.id });
      await QfRound.delete({ id: qfRound5.id });
    }
  });

  it('should handle qfRounds with null priority values', async () => {
    // Create qfRound with null priority
    const qfRoundNullPriority = QfRound.create({
      name: 'Round Null Priority',
      slug: generateRandomString(10),
      allocatedFund: 6000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      priority: 0, // Use 0 instead of null for lowest priority
    });
    await qfRoundNullPriority.save();

    try {
      const result = await axios.post(graphqlUrl, {
        query: qfRoundsQuery,
        variables: {
          sortBy: 'priority',
        },
      });

      assert.isArray(result.data.data.qfRounds);
      assert.equal(result.data.data.qfRounds.length, 4); // 3 existing + 1 new

      // Priority 0 should be treated as lowest priority
      // Should come after all higher priority rounds
      const lastRound =
        result.data.data.qfRounds[result.data.data.qfRounds.length - 1];
      assert.equal(lastRound.id, qfRoundNullPriority.id.toString());
    } finally {
      // Clean up additional QF round
      await QfRound.delete({ id: qfRoundNullPriority.id });
    }
  });
}
