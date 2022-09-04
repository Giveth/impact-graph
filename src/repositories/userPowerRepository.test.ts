import { assert } from 'chai';
import {
  generateRandomEtheriumAddress,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { User } from '../entities/user';
import {
  findUsersThatDidntSyncTheirPower,
  insertNewUserPower,
} from './userPowerRepository';

describe(
  'findUsersThatDidntSyncTheirPowerTestCases -->',
  findUsersThatDidntSyncTheirPowerTestCases,
);

function findUsersThatDidntSyncTheirPowerTestCases() {
  it('should return users without a specific givbackround power sync', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    // power for user 1
    const userPowerGivbackRound1 = await insertNewUserPower({
      user: user1,
      // error: error: value "1662127058871" is out of range for type integer
      // consider making the timestamps Dates for easier saving and manipulation
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 1,
      power: 10,
    });
    const userPowerGivbackRound2 = await insertNewUserPower({
      user: user1,
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      power: 10,
    });

    // power for user 2
    const user2PowerGivbackRound2 = await insertNewUserPower({
      user: user2,
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      power: 10,
    });

    const usersWithoutPowerSync = await findUsersThatDidntSyncTheirPower(1);

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
    // power for user 1
    const userPowerGivbackRound1 = await insertNewUserPower({
      user: user1,
      // error: error: value "1662127058871" is out of range for type integer
      // consider making the timestamps Dates for easier saving and manipulation
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 1,
      power: 10,
    });
    const userPowerGivbackRound2 = await insertNewUserPower({
      user: user1,
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      power: 10,
    });

    // power for user 2
    const user2PowerGivbackRound2 = await insertNewUserPower({
      user: user2,
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      power: 10,
    });

    const usersWithoutPowerSync = await findUsersThatDidntSyncTheirPower(2);
    // There are lots of users that dont have power
    assert.isNotEmpty(usersWithoutPowerSync);

    // usersWithoutPowerSync should not include user2
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user2.id));

    // usersWithoutPowerSync should not include user1
    assert.isNotOk(usersWithoutPowerSync.find(user => user.id === user1.id));
  });
}
