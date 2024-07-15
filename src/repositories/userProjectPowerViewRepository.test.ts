import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../test/testUtils.js';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository.js';
import { setPowerRound } from './powerRoundRepository.js';
import {
  getUserProjectPowers,
  refreshUserProjectPowerView,
} from './userProjectPowerViewRepository.js';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot.js';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot.js';
import { PowerBoosting } from '../entities/powerBoosting.js';
import {
  UserPowerOrderDirection,
  UserPowerOrderField,
} from '../resolvers/userProjectPowerResolver.js';
import { AppDataSource } from '../orm.js';
import { addOrUpdatePowerSnapshotBalances } from './powerBalanceSnapshotRepository.js';
import { findPowerSnapshots } from './powerSnapshotRepository.js';

describe('userProjectPowerViewRepository test', () => {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('should set correct power amount for different users', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project.id * 10;

    const user1Boosting = await insertSinglePowerBoosting({
      user: user1,
      project,
      percentage: 10,
    });
    const user2Boosting = await insertSinglePowerBoosting({
      user: user2,
      project,
      percentage: 15,
    });

    await takePowerBoostingSnapshot();
    let [powerSnapshots] = await findPowerSnapshots();
    let snapshot = powerSnapshots[0];

    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 100 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 200 },
    ]);
    await sleep(1);

    user1Boosting.percentage = 20;
    user2Boosting.percentage = 30;
    await PowerBoosting.save([user1Boosting, user2Boosting]);

    await takePowerBoostingSnapshot();
    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[1];
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 200 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 400 },
    ]);

    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();

    const [userPowers, count] = await getUserProjectPowers({
      take: 2,
      skip: 0,
      projectId: project.id,
      orderBy: {
        field: UserPowerOrderField.BoostedPower,
        direction: UserPowerOrderDirection.DESC,
      },
    });

    assert.equal(count, 2);
    assert.equal(userPowers[0].rank, 1);
    assert.equal(userPowers[0].userId, user2.id);
    assert.equal(userPowers[0].projectId, project.id);
    assert.equal(userPowers[0].boostedPower, 75); // (0.15 * 200 + 0.30 * 400) / 2 = 75

    assert.equal(userPowers[1].rank, 2);
    assert.equal(userPowers[1].userId, user1.id);
    assert.equal(userPowers[1].projectId, project.id);
    assert.equal(userPowers[1].boostedPower, 25); // (0.10 * 100 + 0.20 * 200) / 2 = 25
  });

  it('should have correct power amount for different rounds', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project.id * 10;

    const user1Boosting = await insertSinglePowerBoosting({
      user: user1,
      project,
      percentage: 10,
    });
    const user2Boosting = await insertSinglePowerBoosting({
      user: user2,
      project,
      percentage: 15,
    });

    await takePowerBoostingSnapshot();
    let [powerSnapshots] = await findPowerSnapshots();
    let snapshot = powerSnapshots[0];

    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 100 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 200 },
    ]);
    await sleep(1);

    user1Boosting.percentage = 20;
    user2Boosting.percentage = 30;
    await PowerBoosting.save([user1Boosting, user2Boosting]);

    await takePowerBoostingSnapshot();
    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[1];

    snapshot.blockNumber = 2;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 200 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 400 },
    ]);

    await sleep(1);
    user1Boosting.percentage = 30;
    user2Boosting.percentage = 45;
    await PowerBoosting.save([user1Boosting, user2Boosting]);

    await takePowerBoostingSnapshot();
    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[2];
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 300 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 50 },
    ]);

    await sleep(1);
    user1Boosting.percentage = 40;
    user2Boosting.percentage = 60;
    await PowerBoosting.save([user1Boosting, user2Boosting]);

    await takePowerBoostingSnapshot();
    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[3];
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 400 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 70 },
    ]);

    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();

    let [userPowers, count] = await getUserProjectPowers({
      take: 2,
      skip: 0,
      projectId: project.id,
      orderBy: {
        field: UserPowerOrderField.BoostedPower,
        direction: UserPowerOrderDirection.DESC,
      },
    });

    assert.equal(count, 2);
    assert.equal(userPowers[0].rank, 1);
    assert.equal(userPowers[0].userId, user2.id);
    assert.equal(userPowers[0].boostedPower, 75); // (0.15 * 200 + 0.30 * 400) / 2 = 75

    assert.equal(userPowers[1].rank, 2);
    assert.equal(userPowers[1].userId, user1.id);
    assert.equal(userPowers[1].boostedPower, 25); // (0.10 * 100 + 0.20 * 200) / 2 = 25

    await setPowerRound(roundNumber + 1);

    await refreshUserProjectPowerView();

    [userPowers, count] = await getUserProjectPowers({
      take: 2,
      skip: 0,
      projectId: project.id,
      orderBy: {
        field: UserPowerOrderField.BoostedPower,
        direction: UserPowerOrderDirection.DESC,
      },
    });

    assert.equal(count, 2);
    assert.equal(userPowers[0].rank, 1);
    assert.equal(userPowers[0].userId, user1.id);
    assert.equal(userPowers[0].boostedPower, 125); // (0.30 * 300 + 0.40 * 400) / 2 = 125

    assert.equal(userPowers[1].rank, 2);
    assert.equal(userPowers[1].userId, user2.id);
    assert.equal(userPowers[1].boostedPower, 32.25); // (0.45 * 50 + 0.60 * 70) / 2 = 32.25
  });

  it('should set rank correctly', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project1.id * 10;

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 20,
    });
    await insertSinglePowerBoosting({
      user: user3,
      project: project1,
      percentage: 30,
    });

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];
    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 100 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 200 },
      { userId: user3.id, powerSnapshotId: snapshot.id, balance: 300 },
    ]);

    await sleep(1);
    await takePowerBoostingSnapshot();

    snapshot.blockNumber = 2;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 200 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 300 },
      { userId: user3.id, powerSnapshotId: snapshot.id, balance: 400 },
    ]);
    await sleep(1);

    await takePowerBoostingSnapshot();

    snapshot.blockNumber = 3;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      { userId: user1.id, powerSnapshotId: snapshot.id, balance: 300 },
      { userId: user2.id, powerSnapshotId: snapshot.id, balance: 400 },
      { userId: user3.id, powerSnapshotId: snapshot.id, balance: 500 },
    ]);

    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();

    let [userPowers, count] = await getUserProjectPowers({
      take: 3,
      skip: 0,
      projectId: project1.id,
      orderBy: {
        field: UserPowerOrderField.BoostedPower,
        direction: UserPowerOrderDirection.DESC,
      },
    });

    assert.equal(count, 3);
    assert.isArray(userPowers);
    assert.lengthOf(userPowers, 3);

    assert.deepEqual(
      userPowers.map(p => p.userId),
      [user3.id, user2.id, user1.id],
    );

    userPowers.forEach((p, i) => {
      assert.equal(p.rank, i + 1);
    });

    // Pagination
    [userPowers, count] = await getUserProjectPowers({
      take: 2,
      skip: 1,
      projectId: project1.id,
      orderBy: {
        field: UserPowerOrderField.BoostedPower,
        direction: UserPowerOrderDirection.DESC,
      },
    });
    assert.equal(count, 3);
    assert.isArray(userPowers);
    assert.lengthOf(userPowers, 2);

    assert.deepEqual(
      userPowers.map(p => p.userId),
      [user2.id, user1.id],
    );

    userPowers.forEach((p, i) => {
      assert.equal(p.rank, i + 2);
    });
  });
});
