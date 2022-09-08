import { GivPowerSubgraphAdapter } from './givPowerSubgraphAdapter';
import { assert } from 'chai';
import {
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../../test/testUtils';

describe(
  'getUserPowerInTimeRange() test cases',
  getUserPowerInTimeRangeTestCases,
);

const givPowerSubgraphAdapter = new GivPowerSubgraphAdapter();
function getUserPowerInTimeRangeTestCases() {
  it('should calculate average of power', async () => {
    const averages = await givPowerSubgraphAdapter.getUserPowerInTimeRange({
      walletAddresses: [
        '0x5f672d71399d8cdba64f596394b4f4381247e025',
        '0x38f80f8f76b1c44b2beefb63bb561f570fb6ddb6',
        '0x6c965b656c450259a6d4d95a2e68fb4319eecbc0',
      ],
      fromTimestamp: 1660298787,
      toTimestamp: 1662298787,
    });

    assert.deepEqual(averages, {
      '0x5f672d71399d8cdba64f596394b4f4381247e025': 255.11,
      '0x38f80f8f76b1c44b2beefb63bb561f570fb6ddb6': 1054.69,
      '0x6c965b656c450259a6d4d95a2e68fb4319eecbc0': 2949.09,
    });
  });
  it('should return 0 when fromTimestamp is greater than toTimestamp', async () => {
    const average = await givPowerSubgraphAdapter.getUserPowerInTimeRange({
      walletAddresses: ['0x5f672d71399d8cdba64f596394b4f4381247e025'],
      fromTimestamp: 1660302770,
      toTimestamp: 1660038050,
    });
    assert.deepEqual(average, {
      '0x5f672d71399d8cdba64f596394b4f4381247e025': 0,
    });
  });

  it('should get result of 50 addresses at same time', async () => {
    const walletAddresses: string[] = [];
    for (let i = 0; i < 50; i++) {
      const walletAddress = generateRandomEtheriumAddress();
      await saveUserDirectlyToDb(walletAddress);
      walletAddresses.push(walletAddress);
    }
    const averages = await givPowerSubgraphAdapter.getUserPowerInTimeRange({
      walletAddresses,
      fromTimestamp: 1660302770,
      toTimestamp: 1660038050,
    });
    walletAddresses.forEach(walletAddress =>
      assert.exists(averages[walletAddress]),
    );
  });
}
