import { assert } from 'chai';
// import { formatGivPowerBalance } from './givPowerSubgraphAdapter';
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
  it('should return valid balances for known addresses after recent timestamp', async () => {
    const knownAddresses = [
      '0x8f48094a12c8f99d616ae8f3305d5ec73cbaa6b6',
      '0xc46c67bb7e84490d7ebdd0b8ecdaca68cf3823f4',
      '0xcd192b61a8dd586a97592555c1f5709e032f2505',
    ];

    const { number: blockNumber } =
      await givPowerSubgraphAdapter.getLatestIndexedBlockInfo();

    // Step 1: Get the actual current updatedAt timestamps for those users
    const currentBalances =
      await givPowerSubgraphAdapter.getUserPowerBalanceAtBlockNumber({
        blockNumber,
        walletAddresses: knownAddresses,
      });

    const updatedAts = Object.values(currentBalances).map(b =>
      Number(b.updatedAt),
    );
    const minUpdatedAt = Math.min(...updatedAts);

    // Step 2: Set timestamp just before the earliest updatedAt
    const lastSyncedTimestamp = minUpdatedAt - 10;

    const balances =
      await givPowerSubgraphAdapter.getUserPowerBalanceUpdatedAfterTimestamp({
        blockNumber,
        timestamp: lastSyncedTimestamp,
        take: 100,
        skip: 0,
      });

    const filtered = Object.fromEntries(
      Object.entries(balances).filter(([addr]) =>
        knownAddresses.includes(addr),
      ),
    );

    assert.isAbove(
      Object.keys(filtered).length,
      0,
      'Expected some known balances',
    );

    for (const address of Object.keys(filtered)) {
      const userBalance = filtered[address];
      assert.isAbove(
        userBalance.balance,
        0,
        `Expected balance > 0 for ${address}`,
      );
      assert.isAbove(Number(userBalance.updatedAt), lastSyncedTimestamp);
    }
  });
}
