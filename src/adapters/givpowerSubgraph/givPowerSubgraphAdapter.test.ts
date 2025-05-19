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
  it('should return correct info for block 40146950', async () => {
    const firstAddress = '0x00d18ca9782be1caef611017c2fbc1a39779a57c';
    const secondAddress = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c';
    const fakeWalletAddress = generateRandomEtheriumAddress();
    const result =
      await givPowerSubgraphAdapter.getUserPowerBalanceAtBlockNumber({
        blockNumber: 40146950,
        walletAddresses: [firstAddress, secondAddress, fakeWalletAddress],
      });
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result[firstAddress].balance, 172908.73);
    assert.equal(result[secondAddress].balance, 25000);
    assert.equal(result[fakeWalletAddress].balance, 0);
  });
  it('should return correct info for block 40147019', async () => {
    await new Promise(r => setTimeout(r, Math.random() * 3000));
    const firstAddress = '0x00d18ca9782be1caef611017c2fbc1a39779a57c';
    const secondAddress = '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c';
    const fakeWalletAddress = generateRandomEtheriumAddress();
    const result =
      await givPowerSubgraphAdapter.getUserPowerBalanceAtBlockNumber({
        blockNumber: 40147019,
        walletAddresses: [firstAddress, secondAddress, fakeWalletAddress],
      });
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result[firstAddress].balance, 172908.73);
    assert.equal(result[secondAddress].balance, 25000);
    assert.equal(result[fakeWalletAddress].balance, 0);
  });
}

function getLatestIndexedBlockTestCases() {
  it('should fetch latest block info', async () => {
    await new Promise(r => setTimeout(r, Math.random() * 3000));
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
        balance: '125661000000000000000000',
        updatedAt: '1716229670',
      },
      {
        user: {
          id: '0xc46c67bb7e84490d7ebdd0b8ecdaca68cf3823f4',
        },
        balance: '342013640000000000000000',
        updatedAt: '1702326445',
      },
      {
        user: {
          id: '0xcd192b61a8dd586a97592555c1f5709e032f2505',
        },
        balance: '1000000000000000000000',
        updatedAt: '1726499425',
      },
    ];

    const queryBlockNumber = 40146798;
    const lastSyncedTimestamp = 1680020855;

    const balances =
      await givPowerSubgraphAdapter.getUserPowerBalanceUpdatedAfterTimestamp({
        blockNumber: queryBlockNumber,
        timestamp: lastSyncedTimestamp,
        take: 100,
        skip: 0,
      });

    const relevantBalances = expectedBalances.map(b => b.user.id);
    const filteredBalances = Object.fromEntries(
      Object.entries(balances).filter(([addr]) =>
        relevantBalances.includes(addr),
      ),
    );

    assert.equal(Object.keys(filteredBalances).length, expectedBalances.length);
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
