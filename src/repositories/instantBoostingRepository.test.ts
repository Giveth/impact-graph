import { assert } from 'chai';
import {
  // getLastInstantPowerUpdatedAt,
  getUsersBoostedWithoutInstanceBalance,
  saveOrUpdateInstantPowerBalances,
} from './instantBoostingRepository';
import { InstantPowerBalance } from '../entities/instantPowerBalance';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { PowerBoosting } from '../entities/powerBoosting';
import { insertSinglePowerBoosting } from './powerBoostingRepository';

// describe(
//   'getLastInstantPowerUpdatedAt test cases',
//   getLastInstantPowerUpdatedAtTestCases,
// );
describe(
  'saveOrUpdateInstantPowerBalances test cases',
  saveOrUpdateInstantPowerBalancesTestCases,
);
describe.only(
  'getUsersBoostedWithoutInstanceBalance test cases',
  getUsersBoostedWithoutInstanceBalanceTestCases,
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
//     { userId: user1.id, chainUpdatedAt: 100, balance: 1000 },
//     { userId: user2.id, chainUpdatedAt: 300, balance: 3000 },
//   ]);
//
//   let maxUpdateAt = await getLastInstantPowerUpdatedAt();
//   assert.equal(maxUpdateAt, 300);
//
//   await saveOrUpdateInstantPowerBalances([
//     { userId: user1.id, chainUpdatedAt: 400, balance: 900 },
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
      { userId: user1.id, chainUpdatedAt: 100, balance: 1000 },
      { userId: user2.id, chainUpdatedAt: 300, balance: 3000 },
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
      { userId: user1.id, chainUpdatedAt: 100, balance: 1000 },
      { userId: user2.id, chainUpdatedAt: 300, balance: 3000 },
    ];

    await saveOrUpdateInstantPowerBalances(entities);
    entities[0].chainUpdatedAt = 200;
    entities[0].balance = 2000;

    entities[1].chainUpdatedAt = 400;
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
      { userId: user1.id, chainUpdatedAt: 100, balance: 1000 },
      { userId: user2.id, chainUpdatedAt: 300, balance: 3000 },
    ];

    await saveOrUpdateInstantPowerBalances(entities);

    entities[1].chainUpdatedAt = 400;
    entities[1].balance = 4000;

    entities.push({ userId: user3.id, chainUpdatedAt: 500, balance: 5000 });

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
        chainUpdatedAt: 1000,
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
