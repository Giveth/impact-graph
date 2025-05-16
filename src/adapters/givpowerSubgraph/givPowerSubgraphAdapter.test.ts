import { assert } from 'chai';
import { formatGivPowerBalance } from './givPowerSubgraphAdapter';
import { generateRandomEtheriumAddress } from '../../../test/testUtils';
import { givPowerSubgraphAdapter } from '../adaptersFactory';

describe(
  'getUserPowerBalanceInBlockNumber() test cases',
  getUserPowerBalanceInBlockNumberTestCases,
);
describe('getLatestIndexedBlock test cases', getLatestIndexedBlockTestCases);

describe(
  'getUserPowerBalanceUpdatedAfterTimestamp test cases',
  getUserPowerBalanceUpdatedAfterTimestampTestCases,
);

function getUserPowerBalanceInBlockNumberTestCases() {
  it('should return correct info for block 24124422', async () => {
    // const firstAddress = '0x00d18ca9782be1caef611017c2fbc1a39779a57c';
    // const secondAddress = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c';
    // const fakeWalletAddress = generateRandomEtheriumAddress();
    // const result =
    //   await givPowerSubgraphAdapter.getUserPowerBalanceAtBlockNumber({
    //     blockNumber: 24124422,
    //     walletAddresses: [firstAddress, secondAddress, fakeWalletAddress],
    //   });
    // assert.equal(Object.keys(result).length, 3);
    // assert.equal(result[firstAddress].balance, 127095.68);
    // assert.equal(result[secondAddress].balance, 25000);
    // assert.equal(result[fakeWalletAddress].balance, 0);
    try {
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
    } catch (err: any) {
      console.warn('err', err);
      if (err.response?.status === 429) {
        console.warn('Skipped due to rate limit (429):', err.message);
        return; // gracefully exit the test
      }
      throw err; // rethrow others
    }
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

async function getUserPowerBalanceUpdatedAfterTimestampTestCases() {
  it('should return correct info for from timestamp 1680020855 at block 27723732', async () => {
    const expectedBalances = [
      {
        user: {
          id: '0x8f48094a12c8f99d616ae8f3305d5ec73cbaa6b6',
        },
        balance: '53814827464908927720392',
        updatedAt: '1681744235',
      },
      {
        user: {
          id: '0xc46c67bb7e84490d7ebdd0b8ecdaca68cf3823f4',
        },
        balance: '1332998538238235687437229',
        updatedAt: '1680021855',
      },
      {
        user: {
          id: '0xcd192b61a8dd586a97592555c1f5709e032f2505',
        },
        balance: '90459674185703962293876',
        updatedAt: '1681744235',
      },
    ];
    const queryBlockNumber = 27723732;
    const lastSyncedTimestamp = 1680020855;

    const balances =
      await givPowerSubgraphAdapter.getUserPowerBalanceUpdatedAfterTimestamp({
        blockNumber: queryBlockNumber,
        timestamp: lastSyncedTimestamp,
        take: 100,
        skip: 0,
      });

    assert.equal(Object.keys(balances).length, expectedBalances.length);
    for (const expectedBalance of expectedBalances) {
      const balance = balances[expectedBalance.user.id];
      assert.isOk(balance);
      assert.equal(
        balance.balance,
        formatGivPowerBalance(expectedBalance.balance),
      );
      assert.equal(balance.updatedAt, +expectedBalance.updatedAt);
    }
  });
}
