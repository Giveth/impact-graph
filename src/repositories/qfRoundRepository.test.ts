import { assert, expect } from 'chai';
import moment from 'moment';
import sinon from 'sinon';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import {
  deactivateExpiredQfRounds,
  findQfRoundById,
  findQfRoundBySlug,
  getExpiredActiveQfRounds,
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalSqrtRootSumSquared,
  getQfRoundStats,
  fillMissingTokenPriceInQfRounds,
} from './qfRoundRepository';
import { Project } from '../entities/project';
import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService';
import { getProjectQfRoundStats } from './donationRepository';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';

describe(
  'getProjectDonationsSqrtRootSum test cases',
  getProjectDonationsSqrRootSumTests,
);
describe(
  'getQfRoundTotalProjectsDonationsSum test cases',
  getQfRoundTotalProjectsDonationsSumTestCases,
);
describe(
  'getExpiredActiveQfRounds test cases',
  getExpiredActiveQfRoundsTestCases,
);
describe(
  'deactivateExpiredQfRounds test cases',
  deactivateExpiredQfRoundsTestCases,
);
describe('findQfRoundById test cases', findQfRoundByIdTestCases);
describe('findQfRoundBySlug test cases', findQfRoundBySlugTestCases);
describe(
  'fillMissingTokenPriceInQfRounds test cases',
  fillMissingTokenPriceInQfRoundsTestCase,
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
      slug: new Date().getTime().toString(),
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
    const sqrtRootSum = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    expect(sqrtRootSum).to.equal(0);
    const { uniqueDonorsCount } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });
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

    const sqrtRootSum = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    const { uniqueDonorsCount } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });
    expect(sqrtRootSum).to.equal(10);
    expect(uniqueDonorsCount).to.equal(1);
  });

  it('should return correct value on multiple donations', async () => {
    const valuesUsd = [4, 25, 100, 1024];
    await Promise.all(
      valuesUsd.map(async valueUsd => {
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

    const sqrtRootSum = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );
    const { uniqueDonorsCount } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });
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

    const sqrtRootSum = await getProjectDonationsSqrtRootSum(
      project.id,
      qfRound.id,
    );

    const { uniqueDonorsCount } = await getProjectQfRoundStats({
      projectId: project.id,
      qfRound,
    });
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
      slug: new Date().getTime().toString(),
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
    const { uniqueDonors, totalDonationUsd } = await getQfRoundStats(qfRound);
    expect(totalDonationUsd).to.equal(0);
    expect(uniqueDonors).to.equal(0);
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
    const sum = await getQfRoundTotalSqrtRootSumSquared(qfRound.id);
    const { uniqueDonors } = await getQfRoundStats(qfRound);
    expect(sum).to.equal(289);
    expect(uniqueDonors).to.equal(3);
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
    const sum = await getQfRoundTotalSqrtRootSumSquared(qfRound.id);
    const { uniqueDonors } = await getQfRoundStats(qfRound);
    expect(sum).to.equal(289 * 5);
    expect(uniqueDonors).to.equal(3);
  });
}

function getExpiredActiveQfRoundsTestCases() {
  it('should return zero when there is any active qfRound', async () => {
    const expiredActiveQfRounds = await getExpiredActiveQfRounds();
    assert.equal(expiredActiveQfRounds.length, 0);
  });
  it('should return zero when there is active qfRound but endDate havent passed', async () => {
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(1, 'days').toDate(),
    });
    await qfRound.save();
    const expiredActiveQfRounds = await getExpiredActiveQfRounds();
    assert.equal(expiredActiveQfRounds.length, 0);
  });
  it('should return expired active qfRound when there is some', async () => {
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().subtract(1, 'days').toDate(),
    });
    await qfRound.save();
    const expiredActiveQfRounds = await getExpiredActiveQfRounds();
    assert.equal(expiredActiveQfRounds.length, 1);
  });
}

function deactivateExpiredQfRoundsTestCases() {
  it('should not deactive qfRounds when endDate havent passed', async () => {
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(1, 'days').toDate(),
    });
    await qfRound.save();
    await deactivateExpiredQfRounds();
    const fetchedQfRound = await QfRound.findOne({
      where: { id: qfRound.id },
    });
    assert.isTrue(fetchedQfRound?.isActive);
  });
  it('should deactive qfRounds when endDate  passed', async () => {
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().subtract(1, 'days').toDate(),
    });
    await qfRound.save();
    assert.equal((await getExpiredActiveQfRounds()).length, 1);
    await deactivateExpiredQfRounds();
    const fetchedQfRound = await QfRound.findOne({
      where: { id: qfRound.id },
    });
    assert.isFalse(fetchedQfRound?.isActive);
    assert.equal((await getExpiredActiveQfRounds()).length, 0);
  });
}

function findQfRoundByIdTestCases() {
  it('should return qfRound with id', async () => {
    const qfRound = QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(1, 'days').toDate(),
    });
    await qfRound.save();
    const result = await findQfRoundById(qfRound.id);
    assert.equal(result?.id, qfRound.id);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return inactive qfRound with id', async () => {
    const qfRound = QfRound.create({
      isActive: false,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().subtract(1, 'days').toDate(),
    });
    await qfRound.save();
    const result = await findQfRoundById(qfRound.id);
    assert.equal(result?.id, qfRound.id);
  });
  it('should return null if id is invalid', async () => {
    const result = await findQfRoundById(99999999);
    assert.isNull(result);
  });
}

function findQfRoundBySlugTestCases() {
  it('should return qfRound with slug', async () => {
    const qfRound = QfRound.create({
      isActive: true,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(1, 'days').toDate(),
    });
    await qfRound.save();
    const result = await findQfRoundBySlug(qfRound.slug);
    assert.equal(result?.slug, qfRound.slug);
    qfRound.isActive = false;
    await qfRound.save();
  });
  it('should return inactive qfRound with slug', async () => {
    const qfRound = QfRound.create({
      isActive: false,
      name: new Date().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().subtract(1, 'days').toDate(),
    });
    await qfRound.save();
    const result = await findQfRoundById(qfRound.id);
    assert.equal(result?.id, qfRound.id);
  });
  it('should return null if id is invalid', async () => {
    const result = await findQfRoundById(99999999);
    assert.isNull(result);
  });
}

function fillMissingTokenPriceInQfRoundsTestCase() {
  let priceAdapterStub: sinon.SinonStub;

  beforeEach(async () => {
    // Stub CoingeckoPriceAdapter to mock getTokenPriceAtDate
    priceAdapterStub = sinon
      .stub(CoingeckoPriceAdapter.prototype, 'getTokenPriceAtDate')
      .resolves(100);

    // Reset tokenPrice to undefined for test consistency
    await QfRound.update({}, { tokenPrice: undefined });
  });

  afterEach(() => {
    // Restore the stubbed method after each test
    priceAdapterStub.restore();
  });

  it('should update token price for rounds with null tokenPrice', async () => {
    // Create a QfRound with null token price
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment().subtract(3, 'days').toDate(),
      endDate: moment().add(10, 'days').toDate(),
      tokenPrice: undefined,
    });
    await qfRound.save();

    const updatedCount = await fillMissingTokenPriceInQfRounds();

    const updatedQfRound = await QfRound.findOne({ where: { id: qfRound.id } });
    expect(updatedQfRound?.tokenPrice).to.equal(100);
    expect(updatedCount).to.equal(1);
  });

  it('should not update token price for rounds with existing tokenPrice', async () => {
    // Create a QfRound with an existing token price
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: moment().subtract(3, 'days').toDate(),
      endDate: moment().add(10, 'days').toDate(),
      tokenPrice: 50,
    });
    await qfRound.save();

    const updatedCount = await fillMissingTokenPriceInQfRounds();

    const updatedQfRound = await QfRound.findOne({ where: { id: qfRound.id } });
    expect(updatedQfRound?.tokenPrice).to.equal(50);
    expect(updatedCount).to.equal(0);
  });

  it('should return zero if there are no rounds to update', async () => {
    // Ensure no rounds with null tokenPrice
    await QfRound.update({}, { tokenPrice: 100 });

    const updatedCount = await fillMissingTokenPriceInQfRounds();

    expect(updatedCount).to.equal(0);
  });
}
