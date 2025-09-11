import { assert, expect } from 'chai';
import moment from 'moment';
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
  findQfRounds,
  getExpiredActiveQfRounds,
  getProjectDonationsSqrtRootSum,
  getQfRoundTotalSqrtRootSumSquared,
  getQfRoundStats,
  findUsersWithoutMBDScoreInActiveAround,
} from './qfRoundRepository';
import { Project } from '../entities/project';
import { refreshProjectEstimatedMatchingView } from '../services/projectViewsService';
import { getProjectQfRoundStats } from './donationRepository';

describe(
  'getProjectDonationsSqrtRootSum test cases',
  getProjectDonationsSqrRootSumTests,
);

describe(
  'findUsersWithoutMBDScoreInActiveAround test cases',
  findUsersWithoutMBDScoreInActiveAroundTestCases,
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
describe('findQfRounds test cases', findQfRoundsTestCases);

function findUsersWithoutMBDScoreInActiveAroundTestCases() {
  it('should find users without score that donated in the round', async () => {
    await QfRound.update({}, { isActive: false });
    const qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    project.qfRounds = [qfRound];
    await project.save();

    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
        qfRoundId: qfRound.id,
        status: 'verified',
      },
      user2.id,
      project.id,
    );

    const userIds = await findUsersWithoutMBDScoreInActiveAround();
    assert.equal(userIds.length, 2);
    assert.isTrue(userIds.includes(user.id) && userIds.includes(user2.id));

    qfRound.isActive = false;
    await qfRound.save();
  });
}

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
    const { uniqueDonors, totalDonationUsd, donationsCount } =
      await getQfRoundStats(qfRound);
    expect(totalDonationUsd).to.equal(0);
    expect(uniqueDonors).to.equal(0);
    expect(donationsCount).to.equal(0);
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
    const { uniqueDonors, donationsCount } = await getQfRoundStats(qfRound);
    expect(sum).to.equal(289);
    expect(uniqueDonors).to.equal(3);
    expect(donationsCount).to.equal(6);
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
    const { uniqueDonors, donationsCount } = await getQfRoundStats(qfRound);
    expect(sum).to.equal(289 * 5);
    expect(uniqueDonors).to.equal(3);
    expect(donationsCount).to.equal(12);
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

function findQfRoundsTestCases() {
  let qfRound1: QfRound;
  let qfRound2: QfRound;
  let qfRound3: QfRound;
  let qfRound4: QfRound;

  beforeEach(async () => {
    // Clear QF round references from donations and delete all QF rounds
    await QfRound.query('UPDATE donation SET "qfRoundId" = NULL');
    await QfRound.query('DELETE FROM qf_round_history');
    await QfRound.query('DELETE FROM project_qf_rounds_qf_round');
    await QfRound.query('DELETE FROM qf_round');

    // Create test QF rounds with different priorities and end dates
    const now = new Date();

    qfRound1 = QfRound.create({
      isActive: false,
      name: 'Round 1',
      slug: 'round-1',
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
      slug: 'round-2',
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
      slug: 'round-3',
      allocatedFund: 3000,
      minimumPassportScore: 8,
      beginDate: now,
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      priority: 5, // Same priority as qfRound2
    });
    await qfRound3.save();

    qfRound4 = QfRound.create({
      isActive: false,
      name: 'Round 4',
      slug: 'round-4',
      allocatedFund: 4000,
      minimumPassportScore: 8,
      beginDate: now,
      endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      priority: 1, // Lowest priority
    });
    await qfRound4.save();
  });

  afterEach(async () => {
    // Clean up test QF rounds
    if (qfRound1) await QfRound.delete({ id: qfRound1.id });
    if (qfRound2) await QfRound.delete({ id: qfRound2.id });
    if (qfRound3) await QfRound.delete({ id: qfRound3.id });
    if (qfRound4) await QfRound.delete({ id: qfRound4.id });
  });

  it('should return all QF rounds sorted by priority when sortBy is priority', async () => {
    const result = await findQfRounds({ sortBy: 'priority' });

    assert.isArray(result);
    assert.equal(result.length, 4);

    // Should be sorted by priority DESC, then by endDate ASC
    // Priority 5: qfRound2 (3 days), qfRound3 (7 days)
    // Priority 3: qfRound1 (5 days)
    // Priority 1: qfRound4 (2 days)
    assert.equal(result[0].id, qfRound2.id); // priority 5, closest endDate
    assert.equal(result[1].id, qfRound3.id); // priority 5, further endDate
    assert.equal(result[2].id, qfRound1.id); // priority 3
    assert.equal(result[3].id, qfRound4.id); // priority 1
  });

  it('should return all QF rounds sorted by id DESC when no sortBy is provided', async () => {
    const result = await findQfRounds({});

    assert.isArray(result);
    assert.equal(result.length, 4);

    // Should be sorted by id DESC (newest first)
    const sortedByIds = result.map(r => r.id).sort((a, b) => b - a);
    assert.deepEqual(
      result.map(r => r.id),
      sortedByIds,
    );
  });

  it('should return all QF rounds sorted by id DESC when sortBy is roundId', async () => {
    const result = await findQfRounds({ sortBy: 'roundId' });

    assert.isArray(result);
    assert.equal(result.length, 4);

    // Should be sorted by id DESC (newest first)
    const sortedByIds = result.map(r => r.id).sort((a, b) => b - a);
    assert.deepEqual(
      result.map(r => r.id),
      sortedByIds,
    );
  });

  it('should return QF round by slug when slug is provided', async () => {
    const result = await findQfRounds({ slug: 'round-2' });

    assert.isArray(result);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, qfRound2.id);
    assert.equal(result[0].slug, 'round-2');
  });

  it('should return empty array when slug does not exist', async () => {
    const result = await findQfRounds({ slug: 'non-existent-round' });

    assert.isArray(result);
    assert.equal(result.length, 0);
  });

  it('should handle QF rounds with same priority and same endDate', async () => {
    // Create additional QF round with same priority and endDate as qfRound2
    const sameEndDate = qfRound2.endDate;
    const qfRound5 = QfRound.create({
      isActive: false,
      name: 'Round 5',
      slug: 'round-5',
      allocatedFund: 5000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: sameEndDate,
      priority: 5, // Same priority as qfRound2
    });
    await qfRound5.save();

    try {
      const result = await findQfRounds({ sortBy: 'priority' });

      assert.isArray(result);
      assert.equal(result.length, 5);

      // All priority 5 rounds should come before priority 3 and 1
      const priority5Rounds = result.slice(0, 3); // qfRound2, qfRound3, qfRound5
      const priority3Rounds = result.slice(3, 4); // qfRound1
      const priority1Rounds = result.slice(4); // qfRound4

      // All priority 5 rounds should have priority 5
      priority5Rounds.forEach(round => {
        assert.equal(round.priority, 5);
      });

      // Priority 3 rounds should have priority 3
      priority3Rounds.forEach(round => {
        assert.equal(round.priority, 3);
      });

      // Priority 1 rounds should have priority 1
      priority1Rounds.forEach(round => {
        assert.equal(round.priority, 1);
      });

      // Among priority 5 rounds, should be sorted by endDate ASC
      // qfRound2 and qfRound5 have same endDate, qfRound3 has later endDate
      const priority5Ids = priority5Rounds.map(r => r.id);
      assert.include(priority5Ids, qfRound2.id);
      assert.include(priority5Ids, qfRound5.id);
      assert.include(priority5Ids, qfRound3.id);
    } finally {
      // Clean up additional QF round
      await QfRound.delete({ id: qfRound5.id });
    }
  });

  it('should handle QF rounds with null priority values', async () => {
    // Create QF round with null priority (0)
    const qfRoundNullPriority = QfRound.create({
      isActive: false,
      name: 'Round Null Priority',
      slug: 'round-null-priority',
      allocatedFund: 6000,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      priority: 0, // Use 0 instead of null for lowest priority
    });
    await qfRoundNullPriority.save();

    try {
      const result = await findQfRounds({ sortBy: 'priority' });

      assert.isArray(result);
      assert.equal(result.length, 5);

      // Priority 0 should be treated as lowest priority
      // Should come after all higher priority rounds
      const lastRound = result[result.length - 1];
      assert.equal(lastRound.id, qfRoundNullPriority.id);
      assert.equal(lastRound.priority, 0);
    } finally {
      // Clean up additional QF round
      await QfRound.delete({ id: qfRoundNullPriority.id });
    }
  });

  it('should handle QF rounds with undefined sortBy parameter', async () => {
    const result = await findQfRounds({ sortBy: undefined });

    assert.isArray(result);
    assert.equal(result.length, 4);

    // Should default to id DESC sorting
    const sortedByIds = result.map(r => r.id).sort((a, b) => b - a);
    assert.deepEqual(
      result.map(r => r.id),
      sortedByIds,
    );
  });

  it('should handle QF rounds with invalid sortBy parameter', async () => {
    const result = await findQfRounds({ sortBy: 'invalid' });

    assert.isArray(result);
    assert.equal(result.length, 4);

    // Should default to id DESC sorting
    const sortedByIds = result.map(r => r.id).sort((a, b) => b - a);
    assert.deepEqual(
      result.map(r => r.id),
      sortedByIds,
    );
  });
}
