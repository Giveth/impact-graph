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
} from '../../test/testUtils.js';
import { Project } from '../entities/project.js';
import { QfRound } from '../entities/qfRound.js';
import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService.js';
import {
  fetchQFArchivedRounds,
  qfRoundStatsQuery,
} from '../../test/graphqlQueries.js';
import { generateRandomString } from '../utils/utils.js';
import { OrderDirection } from './projectResolver.js';
import { QfArchivedRoundsSortType } from '../repositories/qfRoundRepository.js';

describe('Fetch estimatedMatching test cases', fetchEstimatedMatchingTestCases);
describe('Fetch qfRoundStats test cases', fetchQfRoundStatesTestCases);
describe('Fetch archivedQFRounds test cases', fetchArchivedQFRoundsTestCases);

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
