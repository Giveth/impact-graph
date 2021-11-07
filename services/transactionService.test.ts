import { assert } from 'chai';
import 'mocha';
import { getTransactionInfoFromNetwork } from './transactionService';
import { assertThrowsAsync } from '../test/testUtils';
import { errorMessages } from '../utils/errorMessages';
import { NETWORK_IDS } from '../provider';
const ONE_DAY = 60 * 60 * 24;

const getTransactionDetailTestCases = () => {
  it('should return transaction detail for normal transfer on mainnet', async () => {
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const amount = 0.04;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
      symbol: 'ETH',
      networkId: NETWORK_IDS.MAIN_NET,
      fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
      toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
      timestamp: 1607360947,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });
  it('should return error when transactionHash is wrong on mainnet', async () => {
    const amount = 0.04;
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da21',
        symbol: 'ETH',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
        toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        amount,
        timestamp: 1607360947,
      });
    };
    await assertThrowsAsync(badFunc, errorMessages.TRANSACTION_NOT_FOUND);
  });

  it('should return error when fromAddress of transaction is different from donation fromAddress', async () => {
    const amount = 0.04;
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
        symbol: 'ETH',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x2ea846dc38c6b6451909f1e7ff2bf613a96dc1f3',
        toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        amount,
        timestamp: 1607360947,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
    );
  });

  it('should return error when fromAddress of transaction is different from donation fromAddress', async () => {
    const amount = 0.04;
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
        symbol: 'ETH',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x2ea846dc38c6b6451909f1e7ff2bf613a96dc1f3',
        toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        amount,
        timestamp: 1607360947,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
    );
  });

  it('should return error when transaction time is newer than sent timestamp on mainnet', async () => {
    const amount = 0.04;
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
        symbol: 'ETH',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
        toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        amount,
        timestamp: 1607360950 + ONE_DAY,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
    );
  });

  it('should return transaction when transactionHash is wrong because of speedup in mainnet', async () => {
    const amount = 0.04;
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const txHash =
      '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da21';
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash,
      symbol: 'ETH',
      networkId: NETWORK_IDS.MAIN_NET,
      fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
      toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
      nonce: 3938,
      amount,
      timestamp: 1607360947,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
    assert.notEqual(transactionInfo.hash, txHash);
  });
  it('should return transaction detail for DAI token transfer on mainnet', async () => {
    // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
    const amount = 1760;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49',
      symbol: 'DAI',
      networkId: NETWORK_IDS.MAIN_NET,
      fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
      toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
      amount,
      timestamp: 1624772582,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'DAI');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return error when fromAddress of transaction is different from donation fromAddress for DAI in mainnet', async () => {
    const amount = 1760;
    // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49',
        symbol: 'DAI',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x2ea846dc38c6b6451909f1e7ff2bf613a96dc1f3',
        toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
        amount,
        nonce: 4,
        timestamp: 1624772582,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
    );
  });

  it('should return error when toAddress of transaction is different to donation toAddress for DAI in mainnet', async () => {
    const amount = 1760;
    // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49',
        symbol: 'DAI',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F4',
        amount,
        nonce: 4,
        timestamp: 1624772582,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
    );
  });

  it('should return error when sent nonce didnt mine already', async () => {
    const amount = 1760;
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f32',
        symbol: 'DAI',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
        amount,
        nonce: 99999999,
        timestamp: 1624772582,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
    );
  });

  it('should return error when transaction amount is different with donation amount', async () => {
    // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
    const amount = 1730;
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49',
        symbol: 'DAI',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
        amount,
        nonce: 4,
        timestamp: 1624772582,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_AMOUNT_IS_DIFFERENT_WITH_SENT_AMOUNT,
    );
  });

  it('should return transaction detail for DAI token transfer on mainnet when transaction is invalid but speedup', async () => {
    // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
    const amount = 1760;
    const txHash =
      '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e871229';
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash,
      symbol: 'DAI',
      networkId: NETWORK_IDS.MAIN_NET,
      fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
      toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
      amount,
      nonce: 4,
      timestamp: 1624772582,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'DAI');
    assert.equal(transactionInfo.amount, amount);
    assert.notEqual(transactionInfo.hash, txHash);
  });

  it('should return transaction detail for normal transfer on ropsten', async () => {
    // https://ropsten.etherscan.io/tx/0xd65478445fa41679fc5fd2a171f56a71a2f006a2246d4b408be97a251e330da7
    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xd65478445fa41679fc5fd2a171f56a71a2f006a2246d4b408be97a251e330da7',
      symbol: 'ETH',
      networkId: NETWORK_IDS.ROPSTEN,
      fromAddress: '0xb20a327c9b4da091f454b1ce0e2e4dc5c128b5b4',
      toAddress: '0x5d28fe1e9f895464aab52287d85ebff32b351674',
      amount,
      timestamp: 1621072452,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for UNI token transfer on ropsten', async () => {
    // https://ropsten.etherscan.io/tx/0xba3c2627c9d3dd963455648b4f9d7239e8b5c80d0aa85ac354d2b762d99e4441
    const amount = 0.01;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xba3c2627c9d3dd963455648b4f9d7239e8b5c80d0aa85ac354d2b762d99e4441',
      symbol: 'UNI',
      networkId: NETWORK_IDS.ROPSTEN,
      fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
      toAddress: '0x8f951903c9360345b4e1b536c7f5ae8f88a64e79',
      amount,
      timestamp: 1615739937,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'UNI');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction when transactionHash is wrong because of speedup on ropsten', async () => {
    // https://ropsten.etherscan.io/tx/0xd65478445fa41679fc5fd2a171f56a71a2f006a2246d4b408be97a251e330da7
    const amount = 0.001;
    const txHash =
      '0xd65478445fa41679fc5fd2a171f56a71a2f006a2246d4b408be97a251e331234';
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash,
      symbol: 'ETH',
      networkId: NETWORK_IDS.ROPSTEN,
      fromAddress: '0xb20a327c9b4da091f454b1ce0e2e4dc5c128b5b4',
      toAddress: '0x5d28fe1e9f895464aab52287d85ebff32b351674',
      amount,
      nonce: 70,
      timestamp: 1621072452,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
    assert.notEqual(transactionInfo.hash, txHash);
    assert.equal(
      transactionInfo.hash,
      '0xd65478445fa41679fc5fd2a171f56a71a2f006a2246d4b408be97a251e330da7',
    );
  });
  it('should return transaction detail for normal transfer on xdai', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c734
    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c734',
      symbol: 'XDAI',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0xb20a327c9b4da091f454b1ce0e2e4dc5c128b5b4',
      toAddress: '0x7ee789b7e6fa20eab7ecbce44626afa7f58a94b7',
      amount,
      timestamp: 1621241124,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'XDAI');
    assert.equal(transactionInfo.amount, amount);
  });
  it('should return error when transactionHash is wrong on  xdai', async () => {
    const amount = 0.001;
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c722',
        symbol: 'XDAI',
        networkId: NETWORK_IDS.XDAI,
        fromAddress: '0xb20a327c9b4da091f454b1ce0e2e4dc5c128b5b4',
        toAddress: '0x7ee789b7e6fa20eab7ecbce44626afa7f58a94b7',
        amount,
        timestamp: 1621241124,
      });
    };
    await assertThrowsAsync(badFunc, errorMessages.TRANSACTION_NOT_FOUND);
  });

  it('should return transaction when transactionHash is wrong because of speedup in xdai', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c734
    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c722',
      symbol: 'XDAI',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0xb20a327c9b4da091f454b1ce0e2e4dc5c128b5b4',
      toAddress: '0x7ee789b7e6fa20eab7ecbce44626afa7f58a94b7',
      amount,
      nonce: 10,
      timestamp: 1621241124,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'XDAI');
    assert.equal(transactionInfo.amount, amount);
  });
  it('should return transaction detail for HNY token transfer on XDAI', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4
    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4',
      symbol: 'HNY',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
      toAddress: '0x5A5a0732c1231D99DB8FFcA38DbEf1c8316fD3E1',
      amount,
      timestamp: 1617903449,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'HNY');
    assert.equal(transactionInfo.amount, amount);
  });
  it('should return transaction detail for USDC token transfer on XDAI', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x00aef89fc40cea0cc0cb7ae5ac18c0e586dccb200b230a9caabca0e08ff7a36b
    const amount = 1;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x00aef89fc40cea0cc0cb7ae5ac18c0e586dccb200b230a9caabca0e08ff7a36b',
      symbol: 'USDC',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
      toAddress: '0x87f1c862c166b0ceb79da7ad8d0864d53468d076',
      amount,
      timestamp: 1626278641,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'USDC');
    assert.equal(transactionInfo.amount, amount);
  });
  it('should return error when transaction time is newer than sent timestamp for HNY token transfer on XDAI', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4
    const amount = 0.001;
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4',
        symbol: 'HNY',
        networkId: NETWORK_IDS.XDAI,
        fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
        toAddress: '0x5A5a0732c1231D99DB8FFcA38DbEf1c8316fD3E1',
        amount,
        timestamp: 1617903450 + ONE_DAY,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
    );
  });
  it('should return transaction detail for HNY token transfer on when transaction is invalid but speedup ', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4
    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c1234',
      symbol: 'HNY',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
      toAddress: '0x5A5a0732c1231D99DB8FFcA38DbEf1c8316fD3E1',
      amount,
      nonce: 41,
      timestamp: 1617903449,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'HNY');
    assert.equal(transactionInfo.amount, amount);
  });
};
describe('getTransactionDetail test cases', getTransactionDetailTestCases);
