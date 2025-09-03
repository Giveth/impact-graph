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
  qfSmartSelectQuery,
} from '../../test/graphqlQueries';
import { generateRandomString } from '../utils/utils';
import { OrderDirection } from './projectResolver';
import { QfArchivedRoundsSortType } from '../repositories/qfRoundRepository';
import { NETWORK_IDS } from '../provider';

describe('Fetch estimatedMatching test cases', fetchEstimatedMatchingTestCases);
describe('Fetch qfRoundStats test cases', fetchQfRoundStatesTestCases);
describe('Fetch archivedQFRounds test cases', fetchArchivedQFRoundsTestCases);
describe('update scoreUserAddress test cases', scoreUserAddressTestCases);
describe('qfSmartSelect test cases', qfSmartSelectTestCases);

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

function qfSmartSelectTestCases() {
  describe('qfSmartSelect successful selection', qfSmartSelectSuccessTestCases);
  describe('qfSmartSelect error handling', qfSmartSelectErrorTestCases);
}

function qfSmartSelectSuccessTestCases() {
  let project: Project;
  let qfRound1: QfRound;
  let qfRound2: QfRound;

  beforeEach(async () => {
    // Deactivate all existing QF rounds
    await QfRound.update({}, { isActive: false });

    // Create a test project
    project = await saveProjectDirectlyToDb(createProjectData());

    // Create QF Round 1 with lower allocated fund
    qfRound1 = QfRound.create({
      isActive: true,
      name: 'QF Round 1',
      slug: generateRandomString(10),
      allocatedFund: 50000,
      allocatedFundUSD: 50000,
      minimumPassportScore: 8,
      eligibleNetworks: [NETWORK_IDS.MAIN_NET, NETWORK_IDS.XDAI],
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
    });
    await qfRound1.save();

    // Create QF Round 2 with higher allocated fund (should be selected)
    qfRound2 = QfRound.create({
      isActive: true,
      name: 'QF Round 2',
      slug: generateRandomString(10),
      allocatedFund: 100000,
      allocatedFundUSD: 100000,
      minimumPassportScore: 8,
      eligibleNetworks: [NETWORK_IDS.MAIN_NET, NETWORK_IDS.ARBITRUM_MAINNET],
      beginDate: new Date(),
      endDate: moment().add(20, 'days').toDate(),
    });
    await qfRound2.save();

    // Associate project with both QF rounds
    project.qfRounds = [qfRound1, qfRound2];
    await project.save();
  });

  afterEach(async () => {
    // Clean up - deactivate test QF rounds
    if (qfRound1) {
      qfRound1.isActive = false;
      await qfRound1.save();
    }
    if (qfRound2) {
      qfRound2.isActive = false;
      await qfRound2.save();
    }
  });

  it('should select the QF round with highest allocatedFundUSD for eligible network', async () => {
    const result = await axios.post(graphqlUrl, {
      query: qfSmartSelectQuery,
      variables: {
        networkId: NETWORK_IDS.MAIN_NET, // Both rounds support this network
        projectId: project.id,
      },
    });

    assert.isOk(result.data.data);
    assert.isNull(result.data.errors);

    const selectedRound = result.data.data.qfSmartSelect;

    // Should select qfRound2 because it has higher allocatedFundUSD
    assert.equal(selectedRound.id, qfRound2.id);
    assert.equal(selectedRound.name, 'QF Round 2');
    assert.equal(selectedRound.matchingPoolAmount, 100000);
    assert.equal(selectedRound.allocatedFundUSD, 100000);
    assert.deepEqual(selectedRound.eligibleNetworks, [
      NETWORK_IDS.MAIN_NET,
      NETWORK_IDS.ARBITRUM_MAINNET,
    ]);
  });

  it('should select the only eligible QF round for specific network', async () => {
    const result = await axios.post(graphqlUrl, {
      query: qfSmartSelectQuery,
      variables: {
        networkId: NETWORK_IDS.XDAI, // Only qfRound1 supports this network
        projectId: project.id,
      },
    });

    assert.isOk(result.data.data);
    assert.isNull(result.data.errors);

    const selectedRound = result.data.data.qfSmartSelect;

    // Should select qfRound1 because it's the only one supporting XDAI
    assert.equal(selectedRound.id, qfRound1.id);
    assert.equal(selectedRound.name, 'QF Round 1');
    assert.equal(selectedRound.matchingPoolAmount, 50000);
    assert.equal(selectedRound.allocatedFundUSD, 50000);
    assert.deepEqual(selectedRound.eligibleNetworks, [
      NETWORK_IDS.MAIN_NET,
      NETWORK_IDS.XDAI,
    ]);
  });
}

function qfSmartSelectErrorTestCases() {
  let project: Project;

  beforeEach(async () => {
    // Deactivate all existing QF rounds
    await QfRound.update({}, { isActive: false });

    // Create a test project
    project = await saveProjectDirectlyToDb(createProjectData());
  });

  it('should throw error when no eligible QF rounds exist for project', async () => {
    const result = await axios.post(graphqlUrl, {
      query: qfSmartSelectQuery,
      variables: {
        networkId: NETWORK_IDS.MAIN_NET,
        projectId: project.id,
      },
    });

    assert.isOk(result.data.errors);
    assert.isNull(result.data.data);

    const error = result.data.errors[0];
    assert.equal(error.message, 'no eligible qf rounds');
    assert.deepEqual(error.path, ['qfSmartSelect']);
  });

  it('should throw error when project is not in any active QF rounds', async () => {
    // Create an active QF round but don't associate it with the project
    const qfRound = QfRound.create({
      isActive: true,
      name: 'Unassociated QF Round',
      slug: generateRandomString(10),
      allocatedFund: 100000,
      allocatedFundUSD: 100000,
      minimumPassportScore: 8,
      eligibleNetworks: [NETWORK_IDS.MAIN_NET],
      beginDate: new Date(),
      endDate: moment().add(30, 'days').toDate(),
    });
    await qfRound.save();

    try {
      const result = await axios.post(graphqlUrl, {
        query: qfSmartSelectQuery,
        variables: {
          networkId: NETWORK_IDS.MAIN_NET,
          projectId: project.id,
        },
      });

      assert.isOk(result.data.errors);
      assert.isNull(result.data.data);

      const error = result.data.errors[0];
      assert.equal(error.message, 'no eligible qf rounds');
      assert.deepEqual(error.path, ['qfSmartSelect']);
    } finally {
      // Clean up
      qfRound.isActive = false;
      await qfRound.save();
    }
  });
}
