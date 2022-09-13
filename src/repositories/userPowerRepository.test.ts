import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  findUsersThatDidntSyncTheirPower,
  insertNewUserPowers,
} from './userPowerRepository';
import { insertSinglePowerBoosting } from './powerBoostingRepository';
import { UserPower } from '../entities/userPower';

describe(
  'findUsersThatDidntSyncTheirPowerTestCases -->',
  findUsersThatDidntSyncTheirPowerTestCases,
);

function findUsersThatDidntSyncTheirPowerTestCases() {
  it('should save userPower correctly', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const roundNumber = 1;

    const userPowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user1],
      averagePowers: { [user1.walletAddress as string]: 9999.9999 },
    });

    // power for user 2
    const user2PowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user2],
      averagePowers: { [user2.walletAddress as string]: 10 },
    });

    const user1Powers = await UserPower.find({
      where: {
        userId: user1.id,
      },
      select: ['userId', 'power', 'givbackRound'],
    });
    const user2Powers = await UserPower.find({
      where: {
        userId: user2.id,
      },
      select: ['userId', 'power', 'givbackRound'],
    });

    assert.lengthOf(user1Powers, 1);
    assert.lengthOf(user2Powers, 1);
    assert.equal(user1Powers[0].power, 9999.9999);
    assert.equal(user2Powers[0].power, 10);
  });
  it('should return users without a specific givbackround power sync', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const roundNumber = firstProject.id * 10;

    await insertSinglePowerBoosting({
      user: user1,
      project: firstProject,
      percentage: 61,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: firstProject,
      percentage: 49.32,
    });

    // power for user 1
    const userPowerGivbackRound1 = await insertNewUserPowers({
      // error: error: value "1662127058871" is out of range for type integer
      // consider making the timestamps Dates for easier saving and manipulation
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user1],
      averagePowers: { [user1.walletAddress as string]: 999.99 },
    });
    const userPowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user1],
      averagePowers: { [user1.walletAddress as string]: 82.12 },
    });

    // power for user 2
    const user2PowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user2],
      averagePowers: { [user2.walletAddress as string]: 0 },
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

    const roundNumber = firstProject.id * 10;

    await insertSinglePowerBoosting({
      user: user1,
      project: firstProject,
      percentage: 23.33,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: firstProject,
      percentage: 12.0,
    });
    await insertSinglePowerBoosting({
      user: user3,
      project: firstProject,
      percentage: 0,
    });
    // power for user 1
    const userPowerGivbackRound1 = await insertNewUserPowers({
      // error: error: value "1662127058871" is out of range for type integer
      // consider making the timestamps Dates for easier saving and manipulation
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      averagePowers: { [user1.walletAddress as string]: 388.99 },
      users: [user1],
    });
    const userPowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber + 1,
      averagePowers: { [user1.walletAddress as string]: 32.11 },
      users: [user1],
    });

    // power for user 2
    const user2PowerGivbackRound2 = await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber + 1,
      averagePowers: { [user2.walletAddress as string]: 4.1 },
      users: [user2],
    });

    const [usersWithoutPowerSync] = await findUsersThatDidntSyncTheirPower(
      roundNumber + 1,
      0,
      user3.id + 1,
    );
    // There are lots of users that dont have power
    assert.isNotEmpty(usersWithoutPowerSync);

    // usersWithoutPowerSync should not include user2
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user2.id));

    // usersWithoutPowerSync should not include user1
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user1.id));
  });
  it('should not return users without any boosted project', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = secondProject.id * 10;

    await insertSinglePowerBoosting({
      user: user1,
      project: firstProject,
      percentage: 0,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: secondProject,
      percentage: 32.1,
    });

    const [usersWithoutPowerSync] = await findUsersThatDidntSyncTheirPower(
      roundNumber,
      0,
      user3.id + 1,
    );

    // usersWithoutPowerSync should include user1
    assert.isOk(usersWithoutPowerSync.find(user => user.id === user1.id));

    // usersWithoutPowerSync should include user2
    assert.isOk(usersWithoutPowerSync.find(user => user.id === user2.id));

    // usersWithoutPowerSync should not include user3
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user3.id));
  });
}
