import { describe } from 'mocha';
import { getSolanaTransactionInfoFromNetwork } from './transactionService';
import { ChainType } from '../../../types/network';
import { NETWORK_IDS } from '../../../provider';
import { assert } from 'chai';

describe(
  'getSolanaTransactionInfoFromNetwork test cases',
  getSolanaTransactionInfoFromNetworkTestCases,
);

function getSolanaTransactionInfoFromNetworkTestCases() {
  it('should return transaction detail for SOL transfer on Solana ', async () => {
    // https://explorer.solana.com/tx/5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8?cluster=devnet
    const amount = 0.001;
    const transactionInfo = await getSolanaTransactionInfoFromNetwork({
      txHash:
        '5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8',
      symbol: 'SOL',
      chainType: ChainType.SOLANA,
      networkId: NETWORK_IDS.SOLANA,
      fromAddress: '5GECDSGSWmMuw6nMfmdBLapa91ZHDZeHqRP1fqvQokjY',
      toAddress: 'DvWdrYYkwyM9mnTetpr3HBHUBKZ22QdbFEXQ8oquE7Zb',
      timestamp: 1702931400,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'SOL');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for mSOL transfer on Solana ', async () => {
    // https://explorer.solana.com/tx/43a7kpg4KKWSqSWJxb7ACi1kLxDh2UVQQ4X7FVK5bnZrtrbjinBFoexA2vWkxDaUWEtmsjjYDm9sDXSxzSm3rJ8C?cluster=devnet
    const amount = 1;
    const transactionInfo = await getSolanaTransactionInfoFromNetwork({
      txHash:
        '43a7kpg4KKWSqSWJxb7ACi1kLxDh2UVQQ4X7FVK5bnZrtrbjinBFoexA2vWkxDaUWEtmsjjYDm9sDXSxzSm3rJ8C',
      symbol: 'mSOL',
      chainType: ChainType.SOLANA,
      networkId: NETWORK_IDS.SOLANA,
      fromAddress: '7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE',
      toAddress: '9SDGiSi9EV2JcHNFBvv9pdypLvaLXd72oEokxEeiU3nB',
      timestamp: 1703449800,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'mSOL');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for mSOL transfer on Solana ', async () => {
    // https://explorer.solana.com/tx/cGseZkZArrW2N8TdEdwFmEu8YzRpQcDQdGmhnQoPLGD8xYN3SRotd8iW4PXqR6iwD7MKCafJuDdke9YfvmWk6PA?cluster=devnet
    const amount = 1;
    const transactionInfo = await getSolanaTransactionInfoFromNetwork({
      txHash:
        'cGseZkZArrW2N8TdEdwFmEu8YzRpQcDQdGmhnQoPLGD8xYN3SRotd8iW4PXqR6iwD7MKCafJuDdke9YfvmWk6PA',
      symbol: 'USDC',
      chainType: ChainType.SOLANA,
      networkId: NETWORK_IDS.SOLANA,
      fromAddress: '7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE',
      toAddress: '9SDGiSi9EV2JcHNFBvv9pdypLvaLXd72oEokxEeiU3nB',
      timestamp: 1703449800,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'mSOL');
    assert.equal(transactionInfo.amount, amount);
  });
}
