import { GivPowerSubgraphAdapter } from './givPowerSubgraphAdapter';
import { assert } from 'chai';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';

describe(
  'getUserPowerBalanceInBlockNumber() test cases',
  getUserPowerBalanceInBlockNumberTestCases,
);

const givPowerSubgraphAdapter = new GivPowerSubgraphAdapter();
function getUserPowerBalanceInBlockNumberTestCases() {
  it('should return correct info for block 24124422', async () => {
    const firstAddress = '0x00d18ca9782be1caef611017c2fbc1a39779a57c';
    const secondAddress = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c';
    const fakeWalletAddress = generateRandomEtheriumAddress();
    const result =
      await givPowerSubgraphAdapter.getUserPowerBalanceInBlockNumber({
        blockNumber: 24124422,
        walletAddresses: [firstAddress, secondAddress, fakeWalletAddress],
      });
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result[firstAddress], 127095.68);
    assert.equal(result[secondAddress], 25000);
    assert.equal(result[fakeWalletAddress], 0);
  });
  it('should return correct info for block 24344249', async () => {
    const firstAddress = '0x00d18ca9782be1caef611017c2fbc1a39779a57c';
    const secondAddress = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c';
    const fakeWalletAddress = generateRandomEtheriumAddress();
    const result =
      await givPowerSubgraphAdapter.getUserPowerBalanceInBlockNumber({
        blockNumber: 24344249,
        walletAddresses: [firstAddress, secondAddress, fakeWalletAddress],
      });
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result[firstAddress], 171808.73);
    assert.equal(result[secondAddress], 25000);
    assert.equal(result[fakeWalletAddress], 0);
  });
}
