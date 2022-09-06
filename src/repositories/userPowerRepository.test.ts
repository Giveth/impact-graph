import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { User } from '../entities/user';
import {
  findUsersThatDidntSyncTheirPower,
  insertNewUserPowers,
} from './userPowerRepository';
import { insertSinglePowerBoosting } from './powerBoostingRepository';

describe(
  'findUsersThatDidntSyncTheirPowerTestCases -->',
  findUsersThatDidntSyncTheirPowerTestCases,
);

function findUsersThatDidntSyncTheirPowerTestCases() {
  it('should return users without a specific givbackround power sync', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: user1,
      project: firstProject,
      percentage: 1,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: firstProject,
      percentage: 1,
    });

    // power for user 1
    const userPowerGivbackRound1 = await insertNewUserPowers({
      // error: error: value "1662127058871" is out of range for type integer
      // consider making the timestamps Dates for easier saving and manipulation
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 1,
      users: [user1],
      averagePowers: { [user1.walletAddress as string]: 10 },
    });
    const userPowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      users: [user1],
      averagePowers: { [user1.walletAddress as string]: 10 },
    });

    // power for user 2
    const user2PowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      users: [user2],
      averagePowers: { [user2.walletAddress as string]: 10 },
    });

    const [usersWithoutPowerSync] = await findUsersThatDidntSyncTheirPower(
      1,
      0,
      user2.id + 1, // Take
    );

    // There are lots of users that dont have power
    assert.isNotEmpty(usersWithoutPowerSync);
    // usersWithoutPowerSync should not include user1
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user1.id));

    // usersWithoutPowerSync should include user2
    assert.isOk(usersWithoutPowerSync.find(user => user.id === user2.id));
  });
  it('should return users without a specific givbackround power sync', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: user1,
      project: firstProject,
      percentage: 1,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: firstProject,
      percentage: 1,
    });
    await insertSinglePowerBoosting({
      user: user3,
      project: firstProject,
      percentage: 1,
    });
    // power for user 1
    const userPowerGivbackRound1 = await insertNewUserPowers({
      // error: error: value "1662127058871" is out of range for type integer
      // consider making the timestamps Dates for easier saving and manipulation
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 1,
      averagePowers: { [user1.walletAddress as string]: 10 },
      users: [user1],
    });
    const userPowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      averagePowers: { [user1.walletAddress as string]: 10 },
      users: [user1],
    });

    // power for user 2
    const user2PowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      averagePowers: { [user2.walletAddress as string]: 10 },
      users: [user2],
    });

    const [usersWithoutPowerSync] = await findUsersThatDidntSyncTheirPower(
      2,
      0,
      user2.id + 1,
    );
    // There are lots of users that dont have power
    assert.isNotEmpty(usersWithoutPowerSync);

    // usersWithoutPowerSync should not include user2
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user2.id));

    // usersWithoutPowerSync should not include user1
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user1.id));
  });
  it('should return users without a boosted any project', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: user1,
      project: firstProject,
      percentage: 1,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: secondProject,
      percentage: 1,
    });

    const [usersWithoutPowerSync] = await findUsersThatDidntSyncTheirPower(
      2,
      0,
      user2.id + 1,
    );

    // usersWithoutPowerSync should include user1
    assert.isOk(usersWithoutPowerSync.find(user => user.id === user1.id));

    // usersWithoutPowerSync should include user2
    assert.isOk(usersWithoutPowerSync.find(user => user.id === user2.id));

    // usersWithoutPowerSync should not include user3
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user3.id));
  });
}
