import { assert } from 'chai';
import {
  getMaxFetchedUpdatedAtTimestamp,
  // getLastInstantPowerUpdatedAt,
  getUsersBoostedWithoutInstanceBalance,
  refreshProjectInstantPowerView,
  saveOrUpdateInstantPowerBalances,
  setMaxFetchedUpdatedAtTimestamp,
} from './instantBoostingRepository.js';
import { InstantPowerBalance } from '../entities/instantPowerBalance.js';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils.js';
import { PowerBoosting } from '../entities/powerBoosting.js';
import { insertSinglePowerBoosting } from './powerBoostingRepository.js';
import { InstantPowerFetchState } from '../entities/instantPowerFetchState.js';
import { ProjectInstantPowerView } from '../views/projectInstantPowerView.js';

// describe(
//   'getLastInstantPowerUpdatedAt test cases',
//   getLastInstantPowerUpdatedAtTestCases,
// );
describe(
  'saveOrUpdateInstantPowerBalances test cases',
  saveOrUpdateInstantPowerBalancesTestCases,
);
describe(
  'getUsersBoostedWithoutInstanceBalance test cases',
  getUsersBoostedWithoutInstanceBalanceTestCases,
);
describe(
  'instance boosting latest synced block test cases',
  latestSyncedBlockTestCases,
);
describe(
  'projectInstantPowerView test cases',
  projectInstantPowerViewTestCases,
);
// function getLastInstantPowerUpdatedAtTestCases() {
// beforeEach(async () => {
//   await InstantPowerBalance.clear();
// });
// it('should return zero for empty table', async () => {
//   const maxUpdateAt = await getLastInstantPowerUpdatedAt();
//   assert.equal(maxUpdateAt, 0);
// });
//
// it('should return correct last chain update at', async () => {
//   const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
//   const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
//
//   await saveOrUpdateInstantPowerBalances([
//     { userId: user1.id, balanceAggregatorUpdatedAt: 100, balance: 1000 },
//     { userId: user2.id, balanceAggregatorUpdatedAt: 300, balance: 3000 },
//   ]);
//
//   let maxUpdateAt = await getLastInstantPowerUpdatedAt();
//   assert.equal(maxUpdateAt, 300);
//
//   await saveOrUpdateInstantPowerBalances([
//     { userId: user1.id, balanceAggregatorUpdatedAt: 400, balance: 900 },
//   ]);
//
//   maxUpdateAt = await getLastInstantPowerUpdatedAt();
//   assert.equal(maxUpdateAt, 400);
// });
// }

function saveOrUpdateInstantPowerBalancesTestCases() {
  beforeEach(async () => {
    await InstantPowerBalance.clear();
  });

  it('should create multiple entities in one call', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const entities: Partial<InstantPowerBalance>[] = [
      {
        userId: user1.id,
        balanceAggregatorUpdatedAt: new Date(100_000),
        balance: 1000,
      },
      {
        userId: user2.id,
        balanceAggregatorUpdatedAt: new Date(300_000),
        balance: 3000,
      },
    ];

    await saveOrUpdateInstantPowerBalances(entities);

    const instances = await InstantPowerBalance.find({
      order: { userId: 'ASC' },
    });

    assert.includeDeepMembers(instances, entities);
  });

  it('should update entities', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const entities: Partial<InstantPowerBalance>[] = [
      {
        userId: user1.id,
        balanceAggregatorUpdatedAt: new Date(100_000),
        balance: 1000,
      },
      {
        userId: user2.id,
        balanceAggregatorUpdatedAt: new Date(300_000),
        balance: 3000,
      },
    ];

    await saveOrUpdateInstantPowerBalances(entities);
    entities[0].balanceAggregatorUpdatedAt = new Date(200_000);
    entities[0].balance = 2000;

    entities[1].balanceAggregatorUpdatedAt = new Date(400_000);
    entities[1].balance = 4000;

    await saveOrUpdateInstantPowerBalances(entities);
    const instances = await InstantPowerBalance.find({
      order: { userId: 'ASC' },
    });

    assert.includeDeepMembers(instances, entities);
  });

  it('should create and update entities together', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const entities: Partial<InstantPowerBalance>[] = [
      {
        userId: user1.id,
        balanceAggregatorUpdatedAt: new Date(100_000),
        balance: 1000,
      },
      {
        userId: user2.id,
        balanceAggregatorUpdatedAt: new Date(300_000),
        balance: 3000,
      },
    ];

    await saveOrUpdateInstantPowerBalances(entities);

    entities[1].balanceAggregatorUpdatedAt = new Date(400_000);
    entities[1].balance = 4000;

    entities.push({
      userId: user3.id,
      balanceAggregatorUpdatedAt: new Date(500_000),
      balance: 5000,
    });

    await saveOrUpdateInstantPowerBalances(entities);
    const instances = await InstantPowerBalance.find({
      order: { userId: 'ASC' },
    });

    assert.includeDeepMembers(instances, entities);
  });
}

function getUsersBoostedWithoutInstanceBalanceTestCases() {
  beforeEach(async () => {
    await PowerBoosting.clear();
  });
  it('should return users have boosted without instance balance', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveUserDirectlyToDb(generateRandomEtheriumAddress()); // User3

    await insertSinglePowerBoosting({
      user: user1,
      project,
      percentage: 100,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project,
      percentage: 100,
    });
    let result = await getUsersBoostedWithoutInstanceBalance();
    assert.deepEqual(result, [
      { id: user1.id, walletAddress: user1.walletAddress },
      { id: user2.id, walletAddress: user2.walletAddress },
    ]);

    await saveOrUpdateInstantPowerBalances([
      {
        userId: user1.id,
        balanceAggregatorUpdatedAt: new Date(1_000_000),
        balance: 1000,
      },
    ]);

    // Save balance for a user, should not have user 1 data in the result anymore
    result = await getUsersBoostedWithoutInstanceBalance();
    assert.deepEqual(result, [
      { id: user2.id, walletAddress: user2.walletAddress },
    ]);
  });
}

function latestSyncedBlockTestCases() {
  beforeEach(async () => {
    await InstantPowerFetchState.clear();
  });
  it('should return 0 for empty table', async () => {
    const result = await getMaxFetchedUpdatedAtTimestamp();
    assert.equal(result, 0);
  });

  it('should return correct latest synced block', async () => {
    await setMaxFetchedUpdatedAtTimestamp(1000);
    const result = await getMaxFetchedUpdatedAtTimestamp();
    assert.equal(result, 1000);

    await setMaxFetchedUpdatedAtTimestamp(2000);
    const result2 = await getMaxFetchedUpdatedAtTimestamp();
    assert.equal(result2, 2000);
  });
}

function projectInstantPowerViewTestCases() {
  beforeEach(async () => {
    await InstantPowerBalance.clear();
    await PowerBoosting.clear();
  });

  it('should return correct order and values of projects instant power', async () => {
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    await saveProjectDirectlyToDb(createProjectData());
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveUserDirectlyToDb(generateRandomEtheriumAddress()); // User3

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 100,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project2,
      percentage: 100,
    });

    await saveOrUpdateInstantPowerBalances([
      {
        userId: user1.id,
        balanceAggregatorUpdatedAt: new Date(1_000_000),
        balance: 1000,
      },
      {
        userId: user2.id,
        balanceAggregatorUpdatedAt: new Date(2_000_000),
        balance: 2000,
      },
    ]);

    await refreshProjectInstantPowerView();
    const result = await ProjectInstantPowerView.find({
      order: { totalPower: 'DESC' },
      select: ['projectId', 'totalPower', 'powerRank'],
    });

    assert.isAtLeast(result.length, 3);
    assert.include(result[0], {
      projectId: project2.id,
      totalPower: 2000,
      powerRank: '1',
    });
    assert.include(result[1], {
      projectId: project1.id,
      totalPower: 1000,
      powerRank: '2',
    });

    // The rest of projects must have 0 power and rank 3
    assert.include(result[2], {
      totalPower: 0,
      powerRank: '3',
    });
  });
}
