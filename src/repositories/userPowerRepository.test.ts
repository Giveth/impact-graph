import { assert } from 'chai';
import { generateRandomEtheriumAddress } from '../../test/testUtils';
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
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user1 = await User.create(userData).save();

    const user2Data = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth2@giveth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };

    const user2 = await User.create(user2Data).save();

    // power for user 1
    const userPowerGivbackRound1 = await insertNewUserPower({
      user: user1,
      // error: error: value "1662127058871" is out of range for type integer
      // consider making the timestamps Dates for easier saving and manipulation
      fromTimestamp: 1233,
      toTimestamp: 12345,
      givbackRound: 1,
      power: 10,
    });
    const userPowerGivbackRound2 = await insertNewUserPower({
      user: user1,
      fromTimestamp: 1233,
      toTimestamp: 12345,
      givbackRound: 2,
      power: 10,
    });

    // power for user 2
    const user2PowerGivbackRound2 = await insertNewUserPower({
      user: user2,
      fromTimestamp: 12345,
      toTimestamp: 123456,
      givbackRound: 2,
      power: 10,
    });

    const usersWithoutPowerSync = await findUsersThatDidntSyncTheirPower(1);
    usersWithoutPowerSync.forEach(user => {
      // only round 1 is returned and since we want those without the relationship
      // present, they should have no relationship returned
      assert.isTrue(user!.userPowers!.length === 0);
    });
    const user1ShouldNotBePresent = usersWithoutPowerSync.filter(
      user => user.id === user1.id,
    );
    assert.isEmpty(user1ShouldNotBePresent);
  });
}
