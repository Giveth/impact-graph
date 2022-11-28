import { PowerSnapshot } from '../entities/powerSnapshot';
import {
  findInCompletePowerSnapShots,
  getPowerBoostingSnapshotWithoutBalance,
  updatePowerSnapshotSyncedFlag,
} from './powerSnapshotRepository';
import { assert } from 'chai';
import moment from 'moment';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { getConnection } from 'typeorm';

describe(
  'findInCompletePowerSnapShots() test cases',
  findInCompletePowerSnapShotsTestCases,
);
describe.only(
  'findPowerSnapshotById() test cases',
  findPowerSnapshotByIdTestCases,
);
describe('test balance snapshot functions', balanceSnapshotTestCases);

function balanceSnapshotTestCases() {
  it('should return power snapshots with not corresponding balance snapshot', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    let powerSnapshotTime = user1.id * 1000;

    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime++),
        blockNumber: 100,
      },
      {
        time: new Date(powerSnapshotTime++),
      },
    ]);
    await PowerSnapshot.save(powerSnapshots);

    const powerBoostingSnapshots = PowerBoostingSnapshot.create([
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 10,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user2.id,
        projectId: project1.id,
        percentage: 20,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 11,
        powerSnapshot: powerSnapshots[1],
      },
      {
        userId: user2.id,
        projectId: project1.id,
        percentage: 21,
        powerSnapshot: powerSnapshots[1],
      },
    ]);
    await PowerBoostingSnapshot.save(powerBoostingSnapshots);

    const powerBalances = PowerBalanceSnapshot.create([
      {
        userId: user1.id,
        balance: 1,
        powerSnapshot: powerSnapshots[0],
      },
    ]);

    await PowerBalanceSnapshot.save(powerBalances);

    PowerBalanceSnapshot.create({
      userId: user1.id,
      powerSnapshot: powerSnapshots[0],
      balance: 10,
    });

    const result = await getPowerBoostingSnapshotWithoutBalance();
    assert.lengthOf(result, 1);
    assert.deepEqual(result[0], {
      userId: user2.id,
      powerSnapshotId: powerSnapshots[0].id,
      walletAddress: user2.walletAddress,
      blockNumber: powerSnapshots[0].blockNumber,
    });
  });
  it('should return user wallet address alongside power snapshots', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    let powerSnapshotTime = user1.id * 1000;

    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime++),
        blockNumber: 100,
      },
      {
        time: new Date(powerSnapshotTime++),
      },
    ]);
    await PowerSnapshot.save(powerSnapshots);

    const powerBoostingSnapshots = PowerBoostingSnapshot.create([
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 10,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user2.id,
        projectId: project1.id,
        percentage: 20,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 11,
        powerSnapshot: powerSnapshots[1],
      },
      {
        userId: user2.id,
        projectId: project1.id,
        percentage: 21,
        powerSnapshot: powerSnapshots[1],
      },
    ]);
    await PowerBoostingSnapshot.save(powerBoostingSnapshots);

    const powerBalances = PowerBalanceSnapshot.create([
      {
        userId: user1.id,
        balance: 1,
        powerSnapshot: powerSnapshots[0],
      },
    ]);

    await PowerBalanceSnapshot.save(powerBalances);

    PowerBalanceSnapshot.create({
      userId: user1.id,
      powerSnapshot: powerSnapshots[0],
      balance: 10,
    });

    const result = await getPowerBoostingSnapshotWithoutBalance();
    assert.lengthOf(result, 1);
    assert.deepEqual(result[0], {
      userId: user2.id,
      powerSnapshotId: powerSnapshots[0].id,
      walletAddress: user2.walletAddress,
      blockNumber: powerSnapshots[0].blockNumber,
    });
  });

  it('should return power snapshots with not corresponding balance snapshot - pagination', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    let powerSnapshotTime = user1.id * 1000;

    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime++),
        blockNumber: 1000,
      },
      {
        time: new Date(powerSnapshotTime++),
        blockNumber: 2000,
      },
      {
        time: new Date(powerSnapshotTime++),
        blockNumber: 3000,
      },
    ]);
    await PowerSnapshot.save(powerSnapshots);

    const powerBoostingSnapshots = PowerBoostingSnapshot.create([
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 10,
        powerSnapshot: powerSnapshots[2],
      },
      {
        userId: user2.id,
        projectId: project1.id,
        percentage: 20,
        powerSnapshot: powerSnapshots[1],
      },
      {
        userId: user3.id,
        projectId: project1.id,
        percentage: 30,
        powerSnapshot: powerSnapshots[0],
      },
    ]);
    await PowerBoostingSnapshot.save(powerBoostingSnapshots);

    // Only one slot
    // Must return corresponding to the first snapshot and only one
    let result = await getPowerBoostingSnapshotWithoutBalance(1, 0);
    assert.lengthOf(result, 1);
    assert.deepEqual(result[0], {
      userId: user3.id,
      powerSnapshotId: powerSnapshots[0].id,
      walletAddress: user3.walletAddress,
      blockNumber: powerSnapshots[0].blockNumber,
    });

    // Must return 2 last items in order
    result = await getPowerBoostingSnapshotWithoutBalance(2, 1);
    assert.lengthOf(result, 2);
    assert.deepEqual(result, [
      {
        userId: user2.id,
        walletAddress: user2.walletAddress,
        powerSnapshotId: powerSnapshots[1].id,
        blockNumber: powerSnapshots[1].blockNumber,
      },
      {
        userId: user1.id,
        walletAddress: user1.walletAddress,
        powerSnapshotId: powerSnapshots[2].id,
        blockNumber: powerSnapshots[2].blockNumber,
      },
    ]);
  });
}

function findInCompletePowerSnapShotsTestCases() {
  it('should return just incomplete powerSnapshots', async () => {
    const snapShot1 = await PowerSnapshot.create({
      time: moment().subtract(10, 'minutes'),
    }).save();
    const snapShot2 = await PowerSnapshot.create({
      time: moment().subtract(8, 'minutes'),
      blockNumber: 12,
      roundNumber: 12,
    }).save();
    const snapShot3 = await PowerSnapshot.create({
      time: moment().subtract(9, 'minutes'),
    }).save();
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    assert.isOk(
      incompleteSnapshots.find(snapshot => snapshot.id === snapShot1.id),
    );
    assert.isNotOk(
      incompleteSnapshots.find(snapshot => snapshot.id === snapShot2.id),
    );
    assert.isOk(
      incompleteSnapshots.find(snapshot => snapshot.id === snapShot3.id),
    );
  });
}

function findPowerSnapshotByIdTestCases() {
  it('should set synced snapshots flag', async () => {
    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    let powerSnapshotTime = user1.id * 1000;

    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime++),
      },
      {
        time: new Date(powerSnapshotTime++),
      },
      {
        time: new Date(powerSnapshotTime++),
      },
      {
        time: new Date(powerSnapshotTime++),
      },
    ]);

    await PowerSnapshot.save(powerSnapshots);

    const [firstSnapshot, secondSnapshot, thirdSnapshot, forthSnapshot] =
      powerSnapshots;

    const powerBoostingSnapshots = PowerBoostingSnapshot.create([
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 10,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 20,
        powerSnapshot: powerSnapshots[1],
      },
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 30,
        powerSnapshot: powerSnapshots[2],
      },
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 40,
        powerSnapshot: powerSnapshots[3],
      },
    ]);

    await PowerBoostingSnapshot.save(powerBoostingSnapshots);

    // No snapshot has blockNumber
    let updateFlatResponse = await updatePowerSnapshotSyncedFlag();

    assert.equal(updateFlatResponse, 0);

    // firstSnapshot with blockNumber without balance saved.

    firstSnapshot.blockNumber = 1000;
    await firstSnapshot.save();
    updateFlatResponse = await updatePowerSnapshotSyncedFlag();

    assert.equal(updateFlatResponse, 0);

    // Filled the balance for the first snapshot
    await PowerBalanceSnapshot.create({
      userId: user1.id,
      balance: 1,
      powerSnapshot: firstSnapshot,
    }).save();

    updateFlatResponse = await updatePowerSnapshotSyncedFlag();
    assert.equal(updateFlatResponse, 1);
    await firstSnapshot.reload();
    assert.isTrue(firstSnapshot.synced);

    // Fill only the third snapshot info

    thirdSnapshot.blockNumber = 3000;
    await thirdSnapshot.save();
    await PowerBalanceSnapshot.create({
      userId: user1.id,
      balance: 1,
      powerSnapshot: thirdSnapshot,
    }).save();
    updateFlatResponse = await updatePowerSnapshotSyncedFlag();
    assert.equal(updateFlatResponse, 1);
    await thirdSnapshot.reload();
    assert.isTrue(thirdSnapshot.synced);

    // Fill second and forth snapshots info
    secondSnapshot.blockNumber = 2000;
    forthSnapshot.blockNumber = 4000;
    await PowerSnapshot.save([secondSnapshot, forthSnapshot]);
    await PowerBalanceSnapshot.save(
      PowerBalanceSnapshot.create([
        {
          userId: user1.id,
          balance: 1,
          powerSnapshot: secondSnapshot,
        },
        {
          userId: user1.id,
          balance: 1,
          powerSnapshot: forthSnapshot,
        },
      ]),
    );
    updateFlatResponse = await updatePowerSnapshotSyncedFlag();
    assert.equal(updateFlatResponse, 2);
    await secondSnapshot.reload();
    await forthSnapshot.reload();
    assert.isTrue(secondSnapshot.synced);
    assert.isTrue(forthSnapshot.synced);
  });
}
