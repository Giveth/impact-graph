import {
  createDonationData,
  createProjectData,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { expect } from 'chai';
import {
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalProjectsDonationsSum,
} from './qfRoundRepository';
import { Project } from '../entities/project';

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
      beginDate: new Date(),
      endDate: new Date(),
    });
    await qfRound.save();
    project = await saveProjectDirectlyToDb(createProjectData());
    project.qfRounds = [qfRound];
    await project.save();
  });

  it('should return 0 when no donations', async () => {
    const { sqrtRootSum, count } = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    expect(sqrtRootSum).to.equal(0);
    expect(count).to.equal(0);
  });

  it('should return correct value on single donation', async () => {
    const donation = await saveDonationDirectlyToDb(
      { ...createDonationData(), valueUsd: 100, qfRoundId: qfRound.id },
      SEED_DATA.FIRST_USER.id,
      project.id,
    );

    const { sqrtRootSum, count } = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    expect(sqrtRootSum).to.equal(10);
    expect(count).to.equal(1);
  });

  it('should return correct value on multiple donations', async () => {
    const valuesUsd = [4, 25, 100, 1024];
    const userIds = [
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.SECOND_USER.id,
      SEED_DATA.THIRD_USER.id,
      SEED_DATA.PROJECT_OWNER_USER.id,
    ];
    const donations = await Promise.all(
      valuesUsd.map((valueUsd, index) => {
        return saveDonationDirectlyToDb(
          { ...createDonationData(), valueUsd, qfRoundId: qfRound.id },
          userIds[index],
          project.id,
        );
      }),
    );

    const { sqrtRootSum, count } = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) + sqrt(1024) = 2 + 5 + 10 + 32 = 49
    const expectedSum = 49;

    expect(sqrtRootSum).to.equal(expectedSum);
    expect(count).to.equal(4);
  });

  it('should return correct value on multiple donations with same user', async () => {
    const usersDonations: [number, number[]][] = [
      [SEED_DATA.FIRST_USER.id, [1, 3]], // 4
      [SEED_DATA.SECOND_USER.id, [2, 23]], // 25
      [SEED_DATA.THIRD_USER.id, [3, 97]], // 100
    ];

    await Promise.all(
      usersDonations.map(([userId, valuesUsd]) => {
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              { ...createDonationData(), valueUsd, qfRoundId: qfRound.id },
              userId,
              project.id,
            );
          }),
        );
      }),
    );

    const { sqrtRootSum, count } = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    // sqrtRootSum = sqrt(4) + sqrt(25) + sqrt(100) = 2 + 5 + 10 = 17
    const expectedSum = 17;

    expect(sqrtRootSum).to.equal(expectedSum);
    expect(count).to.equal(3);
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
      beginDate: new Date(),
      endDate: new Date(),
    });
    await qfRound.save();
    firstProject = await saveProjectDirectlyToDb(createProjectData());
    secondProject = await saveProjectDirectlyToDb(createProjectData());

    firstProject.qfRounds = [qfRound];
    secondProject.qfRounds = [qfRound];

    await firstProject.save();
    await secondProject.save();
  });

  it('should return 0 when no donations', async () => {
    const { sum, contributorsCount } =
      await getQfRoundTotalProjectsDonationsSum(qfRound.id);
    expect(sum).to.equal(0);
    expect(contributorsCount).to.equal(0);
  });

  it('should return correct value for single project', async () => {
    const usersDonations: [number, number[]][] = [
      [SEED_DATA.FIRST_USER.id, [1, 3]], // 4
      [SEED_DATA.SECOND_USER.id, [2, 23]], // 25
      [SEED_DATA.THIRD_USER.id, [3, 97]], // 100
    ];

    await Promise.all(
      usersDonations.map(([userId, valuesUsd]) => {
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              { ...createDonationData(), valueUsd, qfRoundId: qfRound.id },
              userId,
              firstProject.id,
            );
          }),
        );
      }),
    );

    const { sum, contributorsCount } =
      await getQfRoundTotalProjectsDonationsSum(qfRound.id);
    expect(sum).to.equal(289);
    expect(contributorsCount).to.equal(3);
  });

  it('should return correct value for multiple projects', async () => {
    const usersDonations: [number, number, number[]][] = [
      [SEED_DATA.FIRST_USER.id, firstProject.id, [1, 3]], // 4
      [SEED_DATA.FIRST_USER.id, secondProject.id, [4, 4 * 3]], // 16
      [SEED_DATA.SECOND_USER.id, firstProject.id, [2, 23]], // 25
      [SEED_DATA.SECOND_USER.id, secondProject.id, [4 * 2, 4 * 23]], // 25 * 4
      [SEED_DATA.THIRD_USER.id, firstProject.id, [3, 97]], // 100
      [SEED_DATA.THIRD_USER.id, secondProject.id, [3 * 4, 97 * 4]], // 100 * 4
    ];

    await Promise.all(
      usersDonations.map(([userId, projectId, valuesUsd]) => {
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              { ...createDonationData(), valueUsd, qfRoundId: qfRound.id },
              userId,
              projectId,
            );
          }),
        );
      }),
    );

    const { sum, contributorsCount } =
      await getQfRoundTotalProjectsDonationsSum(qfRound.id);
    expect(sum).to.equal(289 * 5);
    expect(contributorsCount).to.equal(3 * 2);
  });
}
