import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { expect } from 'chai';
import {
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalProjectsDonationsSum,
} from './qfRoundRepository';
import { Project } from '../entities/project';
import moment from 'moment';
import {
  refreshProjectDonationSummaryView,
  refreshProjectEstimatedMatchingView,
} from '../services/projectViewsService';

describe(
  'getProjectDonationsSqrtRootSum test cases',
  getProjectDonationsSqrRootSumTests,
);
describe(
  'getQfRoundTotalProjectsDonationsSum test cases',
  getQfRoundTotalProjectsDonationsSumTestCases,
);

function getProjectDonationsSqrRootSumTests() {
  let qfRound: QfRound;
  let project: Project;

  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
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

  it('should return 0 when no donations', async () => {
    const { sqrtRootSum, uniqueDonorsCount } =
      await getProjectDonationsSqrtRootSum(project.id, qfRound.id);
    expect(sqrtRootSum).to.equal(0);
    expect(uniqueDonorsCount).to.equal(0);
  });

  it('should return correct value on single donation', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.passportScore = 10;
    await user.save();
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        status: 'verified',
        valueUsd: 100,
        qfRoundId: qfRound.id,
      },
      user.id,
      project.id,
    );
    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();

    const { sqrtRootSum, uniqueDonorsCount } =
      await getProjectDonationsSqrtRootSum(project.id, qfRound.id);
    expect(sqrtRootSum).to.equal(10);
    expect(uniqueDonorsCount).to.equal(1);
  });

  it('should return correct value on multiple donations', async () => {
    const valuesUsd = [4, 25, 100, 1024];
    await Promise.all(
      valuesUsd.map(async (valueUsd, index) => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
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
    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();

    const { sqrtRootSum, uniqueDonorsCount } =
      await getProjectDonationsSqrtRootSum(project.id, qfRound.id);
    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) + sqrt(1024) = 2 + 5 + 10 + 32 = 49
    const expectedSum = 49;

    expect(sqrtRootSum).to.equal(expectedSum);
    expect(uniqueDonorsCount).to.equal(4);
  });

  it('should return correct value on multiple donations with same user', async () => {
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
    await refreshProjectDonationSummaryView();

    const { sqrtRootSum, uniqueDonorsCount } =
      await getProjectDonationsSqrtRootSum(project.id, qfRound.id);
    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) = 2 + 5 + 10 = 17
    const expectedSum = 17;

    expect(sqrtRootSum).to.equal(expectedSum);
    expect(uniqueDonorsCount).to.equal(3);
  });
}

function getQfRoundTotalProjectsDonationsSumTestCases() {
  let qfRound: QfRound;
  let firstProject: Project;
  let secondProject: Project;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
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

  it('should return 0 when no donations', async () => {
    const { sum, contributorsCount } =
      await getQfRoundTotalProjectsDonationsSum(qfRound.id);
    expect(sum).to.equal(0);
    expect(contributorsCount).to.equal(0);
  });

  it('should return correct value for single project', async () => {
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
              firstProject.id,
            );
          }),
        );
      }),
    );

    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();

    const { sum, contributorsCount } =
      await getQfRoundTotalProjectsDonationsSum(qfRound.id);
    expect(sum).to.equal(289);
    expect(contributorsCount).to.equal(3);
  });

  it('should return correct value for multiple projects', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user1.passportScore = 10;
    await user1.save();
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user2.passportScore = 10;
    await user2.save();
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user3.passportScore = 10;
    await user3.save();
    const usersDonations: [number, number, number[]][] = [
      [user1.id, firstProject.id, [1, 3]], // 4
      [user1.id, secondProject.id, [4, 4 * 3]], // 16
      [user2.id, firstProject.id, [2, 23]], // 25
      [user2.id, secondProject.id, [4 * 2, 4 * 23]], // 25 * 4
      [user3.id, firstProject.id, [3, 97]], // 100
      [user3.id, secondProject.id, [3 * 4, 97 * 4]], // 100 * 4
    ];

    await Promise.all(
      usersDonations.map(([userId, projectId, valuesUsd]) => {
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              userId,
              projectId,
            );
          }),
        );
      }),
    );

    await refreshProjectEstimatedMatchingView();
    await refreshProjectDonationSummaryView();

    const { sum, contributorsCount } =
      await getQfRoundTotalProjectsDonationsSum(qfRound.id);
    expect(sum).to.equal(289 * 5);
    expect(contributorsCount).to.equal(3 * 2);
  });
}
