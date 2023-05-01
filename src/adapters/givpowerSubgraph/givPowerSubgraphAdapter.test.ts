import { GivPowerSubgraphAdapter } from './givPowerSubgraphAdapter';
import { assert } from 'chai';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';

describe(
  'getUserPowerBalanceInBlockNumber() test cases',
  getUserPowerBalanceInBlockNumberTestCases,
);
describe('getLatestIndexedBlock test cases', getLatestIndexedBlockTestCases);

const givPowerSubgraphAdapter = new GivPowerSubgraphAdapter();
function getUserPowerBalanceInBlockNumberTestCases() {
  it('should return correct info for block 24124422', async () => {
    const firstAddress = '0x00d18ca9782be1caef611017c2fbc1a39779a57c';
    const secondAddress = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c';
    const fakeWalletAddress = generateRandomEtheriumAddress();
    const result =
      await givPowerSubgraphAdapter.getUserPowerBalanceAtBlockNumber({
        blockNumber: 24124422,
        walletAddresses: [firstAddress, secondAddress, fakeWalletAddress],
      });
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result[firstAddress].balance, 127095.68);
    assert.equal(result[secondAddress].balance, 25000);
    assert.equal(result[fakeWalletAddress].balance, 0);
  });
  it('should return correct info for block 24344249', async () => {
    const firstAddress = '0x00d18ca9782be1caef611017c2fbc1a39779a57c';
    const secondAddress = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c';
    const fakeWalletAddress = generateRandomEtheriumAddress();
    const result =
      await givPowerSubgraphAdapter.getUserPowerBalanceAtBlockNumber({
        blockNumber: 24344249,
        walletAddresses: [firstAddress, secondAddress, fakeWalletAddress],
      });
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result[firstAddress].balance, 171808.73);
    assert.equal(result[secondAddress].balance, 25000);
    assert.equal(result[fakeWalletAddress].balance, 0);
  });
}

function getLatestIndexedBlockTestCases() {
  it('should fetch latest block info', async () => {
    const block = await givPowerSubgraphAdapter.getLatestIndexedBlockInfo();
    assert.isOk(block);
    assert.isAbove(block.number, 0);
    assert.isAbove(block.timestamp, 0);
  });
}
