import { GivPowerSubgraphAdapter } from './givPowerSubgraphAdapter';
import { assert } from 'chai';

describe(
  'getUserPowerInTimeRange() test cases',
  getUserPowerInTimeRangeTestCases,
);

const givPowerSubgraphAdapter = new GivPowerSubgraphAdapter();
function getUserPowerInTimeRangeTestCases() {
  it('should calculate average of power', async () => {
    const average = await givPowerSubgraphAdapter.getUserPowerInTimeRange({
      walletAddress: '0x5f672d71399d8cdba64f596394b4f4381247e025',
      fromTimestamp: 1660038050,
      toTimestamp: 1660302770,
    });
    assert.equal(average, 427274.44);
  });
  it('should return 0 when fromTimestamp is greater than toTimestamp', async () => {
    const average = await givPowerSubgraphAdapter.getUserPowerInTimeRange({
      walletAddress: '0x5f672d71399d8cdba64f596394b4f4381247e025',
      fromTimestamp: 1660302770,
      toTimestamp: 1660038050,
    });
    assert.equal(average, 0);
  });
}
