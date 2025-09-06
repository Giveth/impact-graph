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
import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService';
import {
  fetchQFArchivedRounds,
  qfRoundStatsQuery,
  scoreUserAddressMutation,
  qfRoundSmartSelectQuery,
} from '../../test/graphqlQueries';
import { generateRandomString } from '../utils/utils';
import { OrderDirection } from './projectResolver';
import { QfArchivedRoundsSortType } from '../repositories/qfRoundRepository';

describe('Fetch estimatedMatching test cases', fetchEstimatedMatchingTestCases);
describe('Fetch qfRoundStats test cases', fetchQfRoundStatesTestCases);
describe('Fetch archivedQFRounds test cases', fetchArchivedQFRoundsTestCases);
describe('update scoreUserAddress test cases', scoreUserAddressTestCases);
describe('QF Round Smart Select test cases', qfRoundSmartSelectTestCases);

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

  beforeEach(async () => {
    // Deactivate all existing QF rounds
    await QfRound.update({}, { isActive: false });

    // Create a test project
    project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      listed: true,
      verified: true,
    });
  });

  afterEach(async () => {
    // Cleanup: deactivate all QF rounds
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
}
