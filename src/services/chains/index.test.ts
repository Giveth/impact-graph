import { assert } from 'chai';
import moment from 'moment';
import { NETWORK_IDS } from '../../provider';
import { assertThrowsAsync } from '../../../test/testUtils';
import { errorMessages } from '../../utils/errorMessages';
import { ChainType } from '../../types/network';
import { getTransactionInfoFromNetwork } from './index';

const ONE_DAY = 60 * 60 * 24;

describe('getTransactionDetail test cases', getTransactionDetailTestCases);

function getTransactionDetailTestCases() {
  // it('should return transaction detail for normal transfer on gnosis when it belongs to a multisig', async () => {
  //   // https://etc.blockscout.com/tx/0xb31720ed83098a5ef7f8dd15f345c5a1e643c3b7debb98afab9fb7b96eec23b1
  //   const amount = 0.01;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0xac9a229d772623137e5bb809e2cd09c2ffa6d75dce391ffefef5c50398d706d5',
  //     symbol: 'XDAI',
  //     networkId: NETWORK_IDS.XDAI,
  //     fromAddress: '0xad2386a6F21F028CC0D167411e59C5C3F9829B2c',
  //     toAddress: '0x9924285ff2207d6e36642b6832a515a6a3aedcab',
  //     timestamp: 1696324809,
  //     safeTxHash: 'xxxxxx',
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'XDAI');
  //   assert.equal(transactionInfo.amount, 0.01);
  // });

  it('should return transaction detail for token transfer on gnosis when it belongs to a multisig', async () => {
    // https://etc.blockscout.com/tx/0xb31720ed83098a5ef7f8dd15f345c5a1e643c3b7debb98afab9fb7b96eec23b1
    const amount = 0.1;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x42c0f15029557ec35e61515a89366297fc239a334e3ba22fab15a3f1d04ad53f',
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x76884f5147f7b6d1f3d15cd8224235ea84036f9e',
      toAddress: '0x9924285ff2207d6e36642b6832a515a6a3aedcab',
      timestamp: 1696324809,
      safeTxHash: 'xxxxx',
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'GIV');
    assert.equal(transactionInfo.amount, amount);
  });

  // it('should return transaction detail for token transfer on gnosis when it belongs to a multisig', async () => {
  //   // https://etc.blockscout.com/tx/0xb31720ed83098a5ef7f8dd15f345c5a1e643c3b7debb98afab9fb7b96eec23b1
  //   const amount = 1.0204004980625;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0xb31720ed83098a5ef7f8dd15f345c5a1e643c3b7debb98afab9fb7b96eec23b1',
  //     symbol: 'ETC',
  //     networkId: NETWORK_IDS.XDAI,
  //     fromAddress: '0x8d0846e68a457D457c71124d14D2b43988a17E4f',
  //     toAddress: '0x216D44960291E4129435c719217a7ECAe8c29927',
  //     timestamp: 1696324809,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETC');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  it('should return transaction when transactionHash is wrong because of speedup in ethereum classic', async () => {
    const amount = 1.0204004980625;
    const txHash =
      '0xb31720ed83098a5ef7f8dd15f345c5a1e643c3b7debb98afab9fb7b96eec1111';
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash,
      symbol: 'ETC',
      networkId: NETWORK_IDS.ETC,
      fromAddress: '0x8d0846e68a457D457c71124d14D2b43988a17E4f',
      toAddress: '0x216D44960291E4129435c719217a7ECAe8c29927',
      timestamp: 1696324809,
      nonce: 28,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETC');
    assert.equal(transactionInfo.amount, amount);
    assert.notEqual(transactionInfo.hash, txHash);
  });
  it('should return transaction detail for DAI transfer on ethereum classic', async () => {
    // https://etc.blockscout.com/tx/0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350faf63
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    const amount = 4492.059297640078891631;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350faf63',
      symbol: 'DAI',
      networkId: NETWORK_IDS.ETC,
      fromAddress: '0x1a50354Cb666BD015760399D49b4b4D8a8f4a978',
      toAddress: '0x40E3780e5Bec58629ac4C5Dc3bcA3dF2d7FD0C35',
      timestamp: 1668186000,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'DAI');
    assert.equal(transactionInfo.amount, amount);
  });
  it('should return error when transactionHash is wrong on ethereum classic', async () => {
    // https://etc.blockscout.com/tx/0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350faf63
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        amount: 0.04,
        txHash:
          '0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350f1111',
        symbol: 'DAI',
        networkId: NETWORK_IDS.ETC,
        fromAddress: '0x1a50354Cb666BD015760399D49b4b4D8a8f4a978',
        toAddress: '0x40E3780e5Bec58629ac4C5Dc3bcA3dF2d7FD0C35',
        timestamp: 1668186000,

        nonce: 99999999,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
    );
  });

  it('should return transaction detail for normal transfer on ethereum classic testnet', async () => {
    // https://etc-mordor.blockscout.com/tx/0xdf0581ead2dce7f6b4fd13bf075892245edbf513d96ef03e98e54adbc81c64c2
    const amount = 0.07;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xdf0581ead2dce7f6b4fd13bf075892245edbf513d96ef03e98e54adbc81c64c2',
      symbol: 'mETC',
      networkId: NETWORK_IDS.MORDOR_ETC_TESTNET,
      fromAddress: '0xBF012CE0BBA042aCFfA89d0a2f29407644d46A0c',
      toAddress: '0x1f88F255d9218e0Bd441C72422A3E40a0408ff53',
      timestamp: 1696924970,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'mETC');
    assert.equal(transactionInfo.amount, amount);
  });
  it('should return transaction when transactionHash is wrong because of speedup in ethereum classic testnet', async () => {
    // https://etc-mordor.blockscout.com/tx/0xdf0581ead2dce7f6b4fd13bf075892245edbf513d96ef03e98e54adbc81c64c2
    const amount = 0.07;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xdf0581ead2dce7f6b4fd13bf075892245edbf513d96ef03e98e54adbc81c6111',
      symbol: 'mETC',
      networkId: NETWORK_IDS.MORDOR_ETC_TESTNET,
      fromAddress: '0xBF012CE0BBA042aCFfA89d0a2f29407644d46A0c',
      toAddress: '0x1f88F255d9218e0Bd441C72422A3E40a0408ff53',
      timestamp: 1696924970,
      nonce: 5,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'mETC');
    assert.equal(transactionInfo.amount, amount);
  });
  it('should return error when transactionHash is wrong on ethereum classic testnet', async () => {
    // https://etc.blockscout.com/tx/0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350faf63
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        amount: 0.04,
        txHash:
          '0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350f1111',
        symbol: 'mETC',
        networkId: NETWORK_IDS.MORDOR_ETC_TESTNET,
        fromAddress: '0x1a50354Cb666BD015760399D49b4b4D8a8f4a978',
        toAddress: '0x40E3780e5Bec58629ac4C5Dc3bcA3dF2d7FD0C35',
        timestamp: 1668186000,

        nonce: 99999999,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
    );
  });

  // it('should return transaction detail for normal transfer on mainnet', async () => {
  //   // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
  //   const amount = 0.04;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
  //     symbol: 'ETH',
  //     networkId: NETWORK_IDS.MAIN_NET,
  //     fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
  //     toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //     timestamp: 1607360947,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETH');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for Gitcoin transfer on mainnet', async () => {
  //   // https://etherscan.io/tx/0x860bd7499393a02e0e732bffec4b2cc52ac04220989f053770aa05c63dbf9725
  //   const amount = 2;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x860bd7499393a02e0e732bffec4b2cc52ac04220989f053770aa05c63dbf9725',
  //     symbol: 'GTC',
  //     networkId: NETWORK_IDS.MAIN_NET,
  //     fromAddress: '0xed8db37778804a913670d9367aaf4f043aad938b',
  //     toAddress: '0x236daa98f115caa9991a3894ae387cdc13eaad1b',
  //     timestamp: 1638994045,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'GTC');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  it('should return error when transactionHash is wrong on mainnet', async () => {
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da21',
        symbol: 'ETH',
        networkId: NETWORK_IDS.MAIN_NET,
        fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
        toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
        amount: 0.04,
        nonce: 99999999,
        timestamp: 1607360947,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
    );
  });

  // it('should return error when fromAddress of transaction is different from donation fromAddress', async () => {
  //   const amount = 0.04;
  //   // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
  //       symbol: 'ETH',
  //       networkId: NETWORK_IDS.MAIN_NET,
  //       fromAddress: '0x2ea846dc38c6b6451909f1e7ff2bf613a96dc1f3',
  //       toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //       amount,
  //       timestamp: 1607360947,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
  //   );
  // });

  // it('should return error when fromAddress of transaction is different from donation fromAddress', async () => {
  //   const amount = 0.04;
  //   // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
  //       symbol: 'ETH',
  //       networkId: NETWORK_IDS.MAIN_NET,
  //       fromAddress: '0x2ea846dc38c6b6451909f1e7ff2bf613a96dc1f3',
  //       toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //       amount,
  //       timestamp: 1607360947,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
  //   );
  // });

  // it('should return error when transaction time is newer than sent timestamp on mainnet', async () => {
  //   const amount = 0.04;
  //   // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
  //       symbol: 'ETH',
  //       networkId: NETWORK_IDS.MAIN_NET,
  //       fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
  //       toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //       amount,
  //       timestamp: 1607360950 + ONE_DAY,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
  //   );
  // });

  // it('should return transaction when transactionHash is wrong because of speedup in mainnet', async () => {
  //   const amount = 0.04;
  //   // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
  //   const txHash =
  //     '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da21';
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash,
  //     symbol: 'ETH',
  //     networkId: NETWORK_IDS.MAIN_NET,
  //     fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
  //     toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //     nonce: 3938,
  //     amount,
  //     timestamp: 1607360947,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETH');
  //   assert.equal(transactionInfo.amount, amount);
  //   assert.notEqual(transactionInfo.hash, txHash);
  // });

  // it('should return transaction detail for DAI token transfer on mainnet', async () => {
  //   // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
  //   const amount = 1760;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49',
  //     symbol: 'DAI',
  //     networkId: NETWORK_IDS.MAIN_NET,
  //     fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //     toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
  //     amount,
  //     timestamp: 1624772582,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'DAI');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for DAI token transfer on mainnet, when amount difference is tiny', async () => {
  //   // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
  //   const amount = 1760.001;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49',
  //     symbol: 'DAI',
  //     networkId: NETWORK_IDS.MAIN_NET,
  //     fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //     toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
  //     amount,
  //     timestamp: 1624772582,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'DAI');
  //   assert.equal(transactionInfo.amount, 1760);
  // });

  // it('should return error when fromAddress of transaction is different from donation fromAddress for DAI in mainnet', async () => {
  //   const amount = 1760;
  //   // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49',
  //       symbol: 'DAI',
  //       networkId: NETWORK_IDS.MAIN_NET,
  //       fromAddress: '0x2ea846dc38c6b6451909f1e7ff2bf613a96dc1f3',
  //       toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
  //       amount,
  //       nonce: 4,
  //       timestamp: 1624772582,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
  //   );
  // });

  // it('should return error when toAddress of transaction is different to donation toAddress for DAI in mainnet', async () => {
  //   const amount = 1760;
  //   // https://etherscan.io/tx/0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f49',
  //       symbol: 'DAI',
  //       networkId: NETWORK_IDS.MAIN_NET,
  //       fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //       toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F4',
  //       amount,
  //       nonce: 4,
  //       timestamp: 1624772582,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
  //   );
  // });

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

  it('should return transaction detail for normal transfer on polygon', async () => {
    // https://polygonscan.com/tx/0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8

    const amount = 30_900;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8',
      symbol: 'MATIC',
      networkId: NETWORK_IDS.POLYGON,
      fromAddress: '0x9ead03f7136fc6b4bdb0780b00a1c14ae5a8b6d0',
      toAddress: '0x4632e0bcf15db3f4663fea1a6dbf666e563598cd',
      amount,
      timestamp: 1677400082,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'MATIC');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on optimism-sepolia', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x1b4e9489154a499cd7d0bd7a097e80758e671a32f98559be3b732553afb00809

    const amount = 0.01;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x1b4e9489154a499cd7d0bd7a097e80758e671a32f98559be3b732553afb00809',
      symbol: 'ETH',
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      fromAddress: '0x625bcc1142e97796173104a6e817ee46c593b3c5',
      toAddress: '0x73f9b3f48ebc96ac55cb76c11053b068669a8a67',
      amount,
      timestamp: 1708954960,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on CELO', async () => {
    // https://celoscan.io/tx/0xa2a282cf6a7dec8b166aa52ac3d00fcd15a370d414615e29a168cfbb592e3637

    const amount = 0.999;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xa2a282cf6a7dec8b166aa52ac3d00fcd15a370d414615e29a168cfbb592e3637',
      symbol: 'CELO',
      networkId: NETWORK_IDS.CELO,
      fromAddress: '0xf6436829cf96ea0f8bc49d300c536fcc4f84c4ed',
      toAddress: '0x95b75068b8bc97716a458bedcf4df1cace802c12',
      amount,
      timestamp: 1680072295,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'CELO');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on CELO Alfajores', async () => {
    // https://alfajores.celoscan.io/tx/0x6d983cd5223ca37ffce727b5222dfc382c2856b604b5848c91564bdfe132c376

    const amount = 0.05;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x6d983cd5223ca37ffce727b5222dfc382c2856b604b5848c91564bdfe132c376',
      symbol: 'CELO',
      networkId: NETWORK_IDS.CELO_ALFAJORES,
      fromAddress: '0x54b6ce742fbc89632d5bf94828b7caba6f8e3d65',
      toAddress: '0xffcf8fdee72ac11b5c542428b35eef5769c409f0',
      amount,
      timestamp: 1680081702,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'CELO');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on Arbitrum Mainnet', async () => {
    // https://arbiscan.io/tx/0xdaca7d68e784a60a6975fa9937abb6b287d7fe992ff806f8c375cb4c3b2152f3

    const amount = 0.0038;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xdaca7d68e784a60a6975fa9937abb6b287d7fe992ff806f8c375cb4c3b2152f3',
      symbol: 'ETH',
      networkId: NETWORK_IDS.ARBITRUM_MAINNET,
      fromAddress: '0x015e6fbce5119c32db66e7c544365749bb26cf8b',
      toAddress: '0x5c66fef6ea22f37e7c1f7eee49e4e116d3fbfc68',
      amount,
      timestamp: 1708342629,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on Arbitrum Sepolia', async () => {
    // https://sepolia.arbiscan.io/tx/0x25f17541ccb7248d931f2a1e11058a51ffb4db4968ed3e1d4a019ddc2d44802c

    const amount = 0.0069;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x25f17541ccb7248d931f2a1e11058a51ffb4db4968ed3e1d4a019ddc2d44802c',
      symbol: 'ETH',
      networkId: NETWORK_IDS.ARBITRUM_SEPOLIA,
      fromAddress: '0xefc58dbf0e606c327868b55334998aacb27f9ef2',
      toAddress: '0xc11c479473cd06618fc75816dd6b56be4ac80efd',
      amount,
      timestamp: 1708344659,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for OP token transfer on optimistic', async () => {
    // https://optimistic.etherscan.io/tx/0xf11be189d967831bb8a76656882eeeac944a799bd222acbd556f2156fdc02db4
    const amount = 0.453549908802477308;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xf11be189d967831bb8a76656882eeeac944a799bd222acbd556f2156fdc02db4',
      symbol: 'OP',
      networkId: NETWORK_IDS.OPTIMISTIC,
      fromAddress: '0xbd928f6016b73066d9ad28351a4708174f18ae99',
      toAddress: '0xa01cf08937103a30e06a5c3b4477f9243a4cbef1',
      amount,
      timestamp: 1679384460,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'OP');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on optimistic', async () => {
    // https://optimistic.etherscan.io/tx/0xc645bd4ebcb1cb249be4b3e4dad46075c973fd30649a39f27f5328ded15074e7
    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xc645bd4ebcb1cb249be4b3e4dad46075c973fd30649a39f27f5328ded15074e7',
      symbol: 'ETH',
      networkId: NETWORK_IDS.OPTIMISTIC,
      fromAddress: '0xf23ea0b5f14afcbe532a1df273f7b233ebe41c78',
      toAddress: '0xf23ea0b5f14afcbe532a1df273f7b233ebe41c78',
      amount,
      timestamp: 1679484540,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
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

  it('should return transaction detail for normal transfer on xdai', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x410796933522fdab4e909e53bc3c825e94ca0afb8bed12ee9b34dc82bfa31bd2
    const amount = 0.01;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x410796933522fdab4e909e53bc3c825e94ca0afb8bed12ee9b34dc82bfa31bd2',
      symbol: 'XDAI',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x57748ecb251f2ec36027bf8b7b2c13b69b8e5222',
      toAddress: '0x2c0d12ecee29f36c39510ac41d6dd1287d4fbf8a',
      amount,
      timestamp: 1659325170,
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
        nonce: 99999,
        timestamp: 1621241124,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
    );
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

  it('should return transaction detail for GIV token transfer on XDAI', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x05a6e9dcab0e9561061e9b3be9dff36edda82d250468ad19c93e2926a5e97562
    const amount = 23000.000000000004;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x05a6e9dcab0e9561061e9b3be9dff36edda82d250468ad19c93e2926a5e97562',
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x5D28FE1e9F895464aab52287d85Ebff32B351674',
      toAddress: '0x1079F830C09A886122eA11b46f450d9e4C4c0150',
      amount,
      timestamp: 1658953955,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'GIV');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for GIV token transfer on XDAI', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0xe3b05b89f71b63e385c4971be872a9becd18f696b1e8abaddbc29c1cce59da63
    const amount = 1500;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0xe3b05b89f71b63e385c4971be872a9becd18f696b1e8abaddbc29c1cce59da63',
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x89E12F054526B985188b946063dDc874a62fEd45',
      toAddress: '0xECb179EA5910D652eDa6988E919c7930F5Ffcf11',
      amount,
      timestamp: 1640408645,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'GIV');
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
  it('should return transaction_not_found when it has not being mined before an hour', async () => {
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
        nonce: 0, // for it to skip nonce if
        timestamp: new Date().getTime() / 1000,
      });
    };
    await assertThrowsAsync(badFunc, errorMessages.TRANSACTION_NOT_FOUND);
  });
  it('should return transaction_not_found_and_nonce_is_used when it has not been mined after an hour', async () => {
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
        nonce: 0, // for it to skip nonce if
        timestamp: moment().add(2, 'hour').toDate().getTime() / 1000,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_NOT_FOUND_AND_NONCE_IS_USED,
    );
  });

  // Two below test cases are failing in github actions sometimes because blockscout is down, so I commented them for now

  // it('should return transaction when transactionHash is wrong because of speedup in xdai', async () => {
  //   // https://blockscout.com/xdai/mainnet/tx/0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c734
  //   const amount = 0.001;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c722',
  //     symbol: 'XDAI',
  //     networkId: NETWORK_IDS.XDAI,
  //     fromAddress: '0xb20a327c9b4da091f454b1ce0e2e4dc5c128b5b4',
  //     toAddress: '0x7ee789b7e6fa20eab7ecbce44626afa7f58a94b7',
  //     amount,
  //     nonce: 10,
  //     timestamp: 1621241124,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'XDAI');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for HNY token transfer on when transaction is invalid but speedup ', async () => {
  //   // https://blockscout.com/xdai/mainnet/tx/0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4
  //   const amount = 0.001;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c1234',
  //     symbol: 'HNY',
  //     networkId: NETWORK_IDS.XDAI,
  //     fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
  //     toAddress: '0x5A5a0732c1231D99DB8FFcA38DbEf1c8316fD3E1',
  //     amount,
  //     nonce: 41,
  //     timestamp: 1617903449,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'HNY');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  /// SOLANA
  it('should return transaction detail for SOL transfer on Solana #1', async () => {
    // https://explorer.solana.com/tx/5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8?cluster=devnet
    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8',
      symbol: 'SOL',
      chainType: ChainType.SOLANA,
      networkId: NETWORK_IDS.SOLANA_DEVNET,
      fromAddress: '5GECDSGSWmMuw6nMfmdBLapa91ZHDZeHqRP1fqvQokjY',
      toAddress: 'DvWdrYYkwyM9mnTetpr3HBHUBKZ22QdbFEXQ8oquE7Zb',
      timestamp: 1702931400,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'SOL');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for SOL transfer on Solana #2', async () => {
    // https://explorer.solana.com/tx/3nzHwgxAu7mKw1dhGTVmqzY8Yet3kGWWqP5kr5D2fw1HzqPjqDGDe6xT5PguKXk8nAJcK4GpBEKWw7EzoLykKkCx?cluster=devnet
    const amount = 1;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '3nzHwgxAu7mKw1dhGTVmqzY8Yet3kGWWqP5kr5D2fw1HzqPjqDGDe6xT5PguKXk8nAJcK4GpBEKWw7EzoLykKkCx',
      symbol: 'SOL',
      chainType: ChainType.SOLANA,
      networkId: NETWORK_IDS.SOLANA_DEVNET,
      fromAddress: '9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g',
      toAddress: 'GEhUKKZeENY1TmaavqvLJ5GbbQs9GkzECFSE2bpjzz3k',
      timestamp: 1701289800,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'SOL');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return error when transaction time is newer than sent timestamp for SOL transfer on Solana', async () => {
    // https://explorer.solana.com/tx/5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8?cluster=devnet

    const amount = 0.001;
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8',
        symbol: 'SOL',
        chainType: ChainType.SOLANA,
        networkId: NETWORK_IDS.SOLANA_DEVNET,
        fromAddress: '5GECDSGSWmMuw6nMfmdBLapa91ZHDZeHqRP1fqvQokjY',
        toAddress: 'DvWdrYYkwyM9mnTetpr3HBHUBKZ22QdbFEXQ8oquE7Zb',
        timestamp: 1702931400 + ONE_DAY,
        amount,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
    );
  });

  it('should return transaction detail for spl-token transfer on Solana devnet #1', async () => {
    // https://solscan.io/tx/2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16?cluster=devnet
    const amount = 7;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16',
      symbol: 'TEST-SPL-TOKEN',
      chainType: ChainType.SOLANA,
      networkId: NETWORK_IDS.SOLANA_DEVNET,
      fromAddress: 'BxUK9tDLeMT7AkTR2jBTQQYUxGGw6nuWbQqGtiHHfftn',
      toAddress: 'FAMREy7d73N5jPdoKowQ4QFm6DKPWuYxZh6cwjNAbpkY',
      timestamp: 1704357745,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'TEST-SPL-TOKEN');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for spl-token transfer on Solana devnet #2', async () => {
    // https://solscan.io/tx/3m6f1g2YK6jtbfVfuYsfDbhVzNAqozF8JJyjp1VuFDduecojqeCVK4htKnLTSk3qBwSqYUvgLpBTVpeLJRvNmeTg?cluster=devnet
    const amount = 0.00000005;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '3m6f1g2YK6jtbfVfuYsfDbhVzNAqozF8JJyjp1VuFDduecojqeCVK4htKnLTSk3qBwSqYUvgLpBTVpeLJRvNmeTg',
      symbol: 'TEST-SPL-TOKEN2',
      chainType: ChainType.SOLANA,
      networkId: NETWORK_IDS.SOLANA_DEVNET,
      fromAddress: '26Aks2rN6mfqxdYRXKZbn8CS4GBv6fCMGFYfGWvfFfcx',
      toAddress: '7TJgw4hDHh5wdKep3EsBkGMSvtf9LsxdXf89LA48uHoq',
      timestamp: 1704699701,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'TEST-SPL-TOKEN2');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for RAY spl token transfer on Solana mainnet', async () => {
    // https://solscan.io/tx/4ApdD7usYH5Cp7hsaWGKjnJW3mfyNpRw4S4NJbzwa2CQfnUkjY11sR2G1W3rvXmCzXwu3yNLz2CfkCHY5sQPdWzq
    const amount = 0.005;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '4ApdD7usYH5Cp7hsaWGKjnJW3mfyNpRw4S4NJbzwa2CQfnUkjY11sR2G1W3rvXmCzXwu3yNLz2CfkCHY5sQPdWzq',
      symbol: 'RAY',
      chainType: ChainType.SOLANA,
      networkId: NETWORK_IDS.SOLANA_MAINNET,
      fromAddress: 'FAMREy7d73N5jPdoKowQ4QFm6DKPWuYxZh6cwjNAbpkY',
      toAddress: '6U29tmuvaGsTQqamf9Vt4o15JHTNq5RdJxoRW6NJxRdx',
      timestamp: 1706429516,
      amount,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'RAY');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return error when transaction time is newer than sent timestamp for spl-token transfer on Solana', async () => {
    // https://explorer.solana.com/tx/2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16?cluster=devnet

    const amount = 7;
    const badFunc = async () => {
      await getTransactionInfoFromNetwork({
        txHash:
          '2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16',
        symbol: 'TEST-SPL-TOKEN',
        chainType: ChainType.SOLANA,
        networkId: NETWORK_IDS.SOLANA_DEVNET,
        fromAddress: 'BxUK9tDLeMT7AkTR2jBTQQYUxGGw6nuWbQqGtiHHfftn',
        toAddress: 'FAMREy7d73N5jPdoKowQ4QFm6DKPWuYxZh6cwjNAbpkY',
        timestamp: 1704357745 + ONE_DAY,
        amount,
      });
    };
    await assertThrowsAsync(
      badFunc,
      errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
    );
  });
}
