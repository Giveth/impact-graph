import { assert } from 'chai';
import 'mocha';
import {
  getDisperseTransactions,
  getEvmTransactionTimestamp,
} from './transactionService.js';
import { assertThrowsAsync } from '../../../../test/testUtils.js';
import { NETWORK_IDS } from '../../../provider.js';
describe(
  'getDisperseTransactions test cases',
  getDisperseTransactionsTestCases,
);
describe(
  'getEvmTransactionTimestamp test cases',
  getEvmTransactionTimestampTestCases,
);

function getDisperseTransactionsTestCases() {
  it('Should return transactions, for disperseEther on xdai', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0xfef76283e0ed4d58e0e7982b5f4ccc6867e7d4ef85b9dc78f37ee202064fd1df
    const transactions = await getDisperseTransactions(
      '0xfef76283e0ed4d58e0e7982b5f4ccc6867e7d4ef85b9dc78f37ee202064fd1df',
      NETWORK_IDS.XDAI,
    );
    assert.isArray(transactions);
    assert.equal(transactions.length, 7);
    assert.equal(
      transactions[0].from,
      '0x839395e20bbb182fa440d08f850e6c7a8f6f0780',
    );
    assert.equal(
      transactions[6].to,
      '0xf2f03516e4bf21dadffc69a4c8e858497fe4edbc',
    );
    assert.equal(transactions[1].amount, 1760);
    assert.equal(transactions[3].currency, 'XDAI');
  });
  it('Should return transactions, for disperseToken USDC on xdai', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x44efb6052ac0496ee96aa6d3dae5e99b5c3896b8db90cad866fc25e8958173a9
    const transactions = await getDisperseTransactions(
      '0x44efb6052ac0496ee96aa6d3dae5e99b5c3896b8db90cad866fc25e8958173a9',
      NETWORK_IDS.XDAI,
    );
    assert.isArray(transactions);
    assert.equal(transactions.length, 9);
    assert.equal(
      transactions[0].from,
      '0x7da9a33d15413f499299687cc9d81de84684e28e',
    );
    assert.equal(
      transactions[8].to,
      '0xa8243199049357763784ca3411090dcf3c0cc14d',
    );
    assert.equal(transactions[2].amount, 7.17);
    assert.equal(transactions[3].currency, 'USDC');
  });

  // it('Should return transactions, for disperseEther on mainnet', async () => {
  //   // https://etherscan.io/tx/0x716a32c18bd487ea75db1838e7d778a95dfc602dca651beeae65b801cb975c99
  //   const transactions = await getDisperseTransactions(
  //     '0x716a32c18bd487ea75db1838e7d778a95dfc602dca651beeae65b801cb975c99',
  //     NETWORK_IDS.MAIN_NET,
  //   );
  //   assert.isArray(transactions);
  //   assert.equal(transactions.length, 2);
  //   assert.equal(
  //     transactions[0].from,
  //     '0x9adb3bbc174c73c7539cbadc7e33a83ef7bdcb31',
  //   );
  //   assert.equal(
  //     transactions[0].to,
  //     '0x669dee1a14dca82b917ab2e51110791b9253900f',
  //   );
  //   assert.equal(transactions[0].amount, 0.2);
  //   assert.equal(transactions[1].currency, 'ETH');
  // });

  // it('Should return transactions, for disperseToken USDC on mainnet', async () => {
  //   // https://etherscan.io/tx/0x613ab48576971933f8745e867d38fe9ac468e4b893bdd0c71cdaac34c474d18c
  //   const transactions = await getDisperseTransactions(
  //     '0x613ab48576971933f8745e867d38fe9ac468e4b893bdd0c71cdaac34c474d18c',
  //     NETWORK_IDS.MAIN_NET,
  //   );
  //   assert.isArray(transactions);
  //   assert.equal(transactions.length, 4);
  //   assert.equal(
  //     transactions[0].from,
  //     '0xf0fbaaa7ece80ac41508e442929b81a4c8c8543b',
  //   );
  //   assert.equal(
  //     transactions[0].to,
  //     '0x24dababee6bf5f221b64890e424609ff43d6e148',
  //   );
  //   assert.equal(transactions[2].amount, 1000);
  //   assert.equal(transactions[3].currency, 'USDC');
  // });
}

function getEvmTransactionTimestampTestCases() {
  it('Should return the transaction time from the blockchain', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x42c0f15029557ec35e61515a89366297fc239a334e3ba22fab15a3f1d04ad53f
    const transactionTime = await getEvmTransactionTimestamp({
      txHash:
        '0x42c0f15029557ec35e61515a89366297fc239a334e3ba22fab15a3f1d04ad53f',
      networkId: NETWORK_IDS.XDAI,
    });
    assert.equal(transactionTime, 1702091620);
  });

  it('Should throw error if the transaction is not found', async () => {
    await assertThrowsAsync(async () => {
      await getEvmTransactionTimestamp({
        txHash: '0x',
        networkId: NETWORK_IDS.XDAI,
      });
    }, 'Transaction not found');
  });
}
