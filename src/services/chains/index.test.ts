import { assert } from 'chai';
import moment from 'moment';
import { NETWORK_IDS } from '../../provider';
import { assertThrowsAsync } from '../../../test/testUtils';
import { errorMessages } from '../../utils/errorMessages';
import { getTransactionInfoFromNetwork } from './index';

const ONE_DAY = 60 * 60 * 24;

describe('getTransactionDetail test cases', getTransactionDetailTestCases);
// describe('closeTo test cases', closeToTestCases);

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

  it.skip('should return transaction detail for token transfer on gnosis when it belongs to a multisig', async () => {
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

  // it('should return transaction when transactionHash is wrong because of speedup in ethereum classic', async () => {
  //   const amount = 1.0204004980625;
  //   const txHash =
  //     '0xb31720ed83098a5ef7f8dd15f345c5a1e643c3b7debb98afab9fb7b96eec1111';
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash,
  //     symbol: 'ETC',
  //     networkId: NETWORK_IDS.ETC,
  //     fromAddress: '0x8d0846e68a457D457c71124d14D2b43988a17E4f',
  //     toAddress: '0x216D44960291E4129435c719217a7ECAe8c29927',
  //     timestamp: 1696324809,
  //     nonce: 28,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETC');
  //   assert.equal(transactionInfo.amount, amount);
  //   assert.notEqual(transactionInfo.hash, txHash);
  // });
  it.skip('should return transaction detail for DAI transfer on ethereum classic', async () => {
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
  // it('should return error when transactionHash is wrong on ethereum classic', async () => {
  //   // https://etc.blockscout.com/tx/0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350faf63
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       amount: 0.04,
  //       txHash:
  //         '0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350f1111',
  //       symbol: 'DAI',
  //       networkId: NETWORK_IDS.ETC,
  //       fromAddress: '0x1a50354Cb666BD015760399D49b4b4D8a8f4a978',
  //       toAddress: '0x40E3780e5Bec58629ac4C5Dc3bcA3dF2d7FD0C35',
  //       timestamp: 1668186000,

  //       nonce: 99999999,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
  //   );
  // });

  // it('should return transaction detail for normal transfer on ethereum classic testnet', async () => {
  //   // 🚨 EXTERNAL NETWORK CALL: Blockchain RPC calls - MOCK THIS
  //   // https://etc-mordor.blockscout.com/tx/0xdf0581ead2dce7f6b4fd13bf075892245edbf513d96ef03e98e54adbc81c64c2
  //   const amount = 0.07;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0xdf0581ead2dce7f6b4fd13bf075892245edbf513d96ef03e98e54adbc81c64c2',
  //     symbol: 'mETC',
  //     networkId: NETWORK_IDS.MORDOR_ETC_TESTNET,
  //     fromAddress: '0xBF012CE0BBA042aCFfA89d0a2f29407644d46A0c',
  //     toAddress: '0x1f88F255d9218e0Bd441C72422A3E40a0408ff53',
  //     timestamp: 1696924970,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'mETC');
  //   assert.equal(transactionInfo.amount, amount);
  // });
  // it('should return transaction when transactionHash is wrong because of speedup in ethereum classic testnet', async () => {
  //   // https://etc-mordor.blockscout.com/tx/0xdf0581ead2dce7f6b4fd13bf075892245edbf513d96ef03e98e54adbc81c64c2
  //   const amount = 0.07;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0xdf0581ead2dce7f6b4fd13bf075892245edbf513d96ef03e98e54adbc81c6111',
  //     symbol: 'mETC',
  //     networkId: NETWORK_IDS.MORDOR_ETC_TESTNET,
  //     fromAddress: '0xBF012CE0BBA042aCFfA89d0a2f29407644d46A0c',
  //     toAddress: '0x1f88F255d9218e0Bd441C72422A3E40a0408ff53',
  //     timestamp: 1696924970,
  //     nonce: 5,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'mETC');
  //   assert.equal(transactionInfo.amount, amount);
  // });
  // it('should return error when transactionHash is wrong on ethereum classic testnet', async () => {
  //   // https://etc.blockscout.com/tx/0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350faf63
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       amount: 0.04,
  //       txHash:
  //         '0x48e0c03ed99996fac3a7ecaaf05a1582a9191d8e37b6ebdbdd630b83350f1111',
  //       symbol: 'mETC',
  //       networkId: NETWORK_IDS.MORDOR_ETC_TESTNET,
  //       fromAddress: '0x1a50354Cb666BD015760399D49b4b4D8a8f4a978',
  //       toAddress: '0x40E3780e5Bec58629ac4C5Dc3bcA3dF2d7FD0C35',
  //       timestamp: 1668186000,

  //       nonce: 99999999,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
  //   );
  // });

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

  // it('should return error when transactionHash is wrong on mainnet', async () => {
  //   // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da21',
  //       symbol: 'ETH',
  //       networkId: NETWORK_IDS.MAIN_NET,
  //       fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
  //       toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //       amount: 0.04,
  //       nonce: 99999999,
  //       timestamp: 1607360947,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
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

  // it('should return error when sent nonce didnt mine already', async () => {
  //   const amount = 1760;
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '0x5b80133493a5be96385f00ce22a69c224e66fa1fc52b3b4c33e9057f5e873f32',
  //       symbol: 'DAI',
  //       networkId: NETWORK_IDS.MAIN_NET,
  //       fromAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //       toAddress: '0x2Ea846Dc38C6b6451909F1E7ff2bF613a96DC1F3',
  //       amount,
  //       nonce: 99999999,
  //       timestamp: 1624772582,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
  //   );
  // });

  // it('should return transaction detail for normal transfer on polygon', async () => {
  //   // https://polygonscan.com/tx/0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8

  //   const amount = 30_900;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8',
  //     symbol: 'MATIC',
  //     networkId: NETWORK_IDS.POLYGON,
  //     fromAddress: '0x9ead03f7136fc6b4bdb0780b00a1c14ae5a8b6d0',
  //     toAddress: '0x4632e0bcf15db3f4663fea1a6dbf666e563598cd',
  //     amount,
  //     timestamp: 1677400082,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'MATIC');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for normal transfer on optimism-sepolia', async () => {
  //   // https://sepolia-optimism.etherscan.io/tx/0x1b4e9489154a499cd7d0bd7a097e80758e671a32f98559be3b732553afb00809

  //   const amount = 0.01;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x1b4e9489154a499cd7d0bd7a097e80758e671a32f98559be3b732553afb00809',
  //     symbol: 'ETH',
  //     networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
  //     fromAddress: '0x625bcc1142e97796173104a6e817ee46c593b3c5',
  //     toAddress: '0x73f9b3f48ebc96ac55cb76c11053b068669a8a67',
  //     amount,
  //     timestamp: 1708954960,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETH');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for normal transfer on CELO', async () => {
  //   // https://celoscan.io/tx/0xa2a282cf6a7dec8b166aa52ac3d00fcd15a370d414615e29a168cfbb592e3637

  //   const amount = 0.999;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0xa2a282cf6a7dec8b166aa52ac3d00fcd15a370d414615e29a168cfbb592e3637',
  //     symbol: 'CELO',
  //     networkId: NETWORK_IDS.CELO,
  //     fromAddress: '0xf6436829cf96ea0f8bc49d300c536fcc4f84c4ed',
  //     toAddress: '0x95b75068b8bc97716a458bedcf4df1cace802c12',
  //     amount,
  //     timestamp: 1680072295,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'CELO');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for normal transfer on CELO Alfajores', async () => {
  //   // https://alfajores.celoscan.io/tx/0x6d983cd5223ca37ffce727b5222dfc382c2856b604b5848c91564bdfe132c376

  //   const amount = 0.05;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x6d983cd5223ca37ffce727b5222dfc382c2856b604b5848c91564bdfe132c376',
  //     symbol: 'CELO',
  //     networkId: NETWORK_IDS.CELO_ALFAJORES,
  //     fromAddress: '0x54b6ce742fbc89632d5bf94828b7caba6f8e3d65',
  //     toAddress: '0xffcf8fdee72ac11b5c542428b35eef5769c409f0',
  //     amount,
  //     timestamp: 1680081702,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'CELO');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  it.skip('should return transaction detail for normal transfer on Arbitrum Mainnet', async () => {
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

  // it('should return transaction detail for normal transfer on Arbitrum Sepolia', async () => {
  //   // https://sepolia.arbiscan.io/tx/0x25f17541ccb7248d931f2a1e11058a51ffb4db4968ed3e1d4a019ddc2d44802c

  //   const amount = 0.0069;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x25f17541ccb7248d931f2a1e11058a51ffb4db4968ed3e1d4a019ddc2d44802c',
  //     symbol: 'ETH',
  //     networkId: NETWORK_IDS.ARBITRUM_SEPOLIA,
  //     fromAddress: '0xefc58dbf0e606c327868b55334998aacb27f9ef2',
  //     toAddress: '0xc11c479473cd06618fc75816dd6b56be4ac80efd',
  //     amount,
  //     timestamp: 1708344659,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETH');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  it.skip('should return transaction detail for normal transfer on Base Mainnet', async () => {
    // https://basescan.org/tx/0x1cbf53e5a9a0874b9ad97316e4f2e1782e24bec318bacd183d3f48052bfe1523

    const amount = 0.0032;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x1cbf53e5a9a0874b9ad97316e4f2e1782e24bec318bacd183d3f48052bfe1523',
      symbol: 'ETH',
      networkId: NETWORK_IDS.BASE_MAINNET,
      fromAddress: '0xbaed383ede0e5d9d72430661f3285daa77e9439f',
      toAddress: '0xa5401000d255dbb154deb756b82dd5105486d8c9',
      amount,
      timestamp: 1716445331,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  it.skip('should return transaction detail for normal transfer on Base Sepolia', async () => {
    // https://sepolia.basescan.org/tx/0x66fdfe46de46fa1fbb77de642cc778cafc85943204039f69694aee6121f764f4

    const amount = 0.001;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x66fdfe46de46fa1fbb77de642cc778cafc85943204039f69694aee6121f764f4',
      symbol: 'ETH',
      networkId: NETWORK_IDS.BASE_SEPOLIA,
      fromAddress: '0x9cab0c7ff1c6250e641f4dcd4d9cd9db83bffb71',
      toAddress: '0xd7eedf8422ababfbcafc0797e809ceae742fc142',
      amount,
      timestamp: 1716445488,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  // it('should return transaction detail for normal transfer on ZKEVM Mainnet', async () => {
  //   // https://zkevm.polygonscan.com/tx/0xeba6b0325a2406fe8223bccc187eb7a34692be3a0c4ef76e940e13342e50a897

  //   const amount = 0.008543881896016492;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0xeba6b0325a2406fe8223bccc187eb7a34692be3a0c4ef76e940e13342e50a897',
  //     symbol: 'ETH',
  //     networkId: NETWORK_IDS.ZKEVM_MAINNET,
  //     fromAddress: '0x948Bd3799aB39A4DDc7bd4fB83717b230f035FBF',
  //     toAddress: '0x0d0794f31c53d4057082889B9bed2D599Eda420d',
  //     amount,
  //     timestamp: 1718267319,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETH');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for normal transfer on ZKEVM Cardano', async () => {
  //   // https://cardona-zkevm.polygonscan.com/tx/0x5cadef5d2ee803ff78718deb926964c14d83575ccebf477d48b0c3c768a4152a

  //   const amount = 0.00001;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '0x5cadef5d2ee803ff78718deb926964c14d83575ccebf477d48b0c3c768a4152a',
  //     symbol: 'ETH',
  //     networkId: NETWORK_IDS.ZKEVM_CARDONA,
  //     fromAddress: '0x9AF3049dD15616Fd627A35563B5282bEA5C32E20',
  //     toAddress: '0x417a7BA2d8d0060ae6c54fd098590DB854B9C1d5',
  //     amount,
  //     timestamp: 1718267581,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'ETH');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  it('should return transaction detail for OP token transfer on optimistic', async () => {
    // https://explorer.optimism.io/tx/0x465f7b5abe28d046666c538a4532ab71d9a49d2683ab33bc521732cc489ea7c6
    const amount = 9;
    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x465f7b5abe28d046666c538a4532ab71d9a49d2683ab33bc521732cc489ea7c6',
      symbol: 'OP',
      networkId: NETWORK_IDS.OPTIMISTIC,
      fromAddress: '0x220a6CB04d48CA2c33735E94DF78c17F8B0F7C9F',
      toAddress: '0x4E8356170111dEb9408f8bc98C9a395c0bF330Fb',
      amount,
      timestamp: 1751067581,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'OP');
    assert.equal(transactionInfo.amount, amount);
  });

  it('should return transaction detail for normal transfer on optimistic', async () => {
    // https://explorer.optimism.io/tx/0x46a441e7867f67163602ea7787da1120a6f6eca7719bbffda7e21d5abcb8b338
    const amount = 0.02;

    const transactionInfo = await getTransactionInfoFromNetwork({
      txHash:
        '0x46a441e7867f67163602ea7787da1120a6f6eca7719bbffda7e21d5abcb8b338',
      symbol: 'ETH',
      networkId: NETWORK_IDS.OPTIMISTIC,
      fromAddress: '0xe803AAd78e6eAbCde6f820D2C64cF83402Eddbe2',
      toAddress: '0x4E8356170111dEb9408f8bc98C9a395c0bF330Fb',
      amount,
      timestamp: 1750940881,
    });
    assert.isOk(transactionInfo);
    assert.equal(transactionInfo.currency, 'ETH');
    assert.equal(transactionInfo.amount, amount);
  });

  it.skip('should return transaction detail for normal transfer on xdai', async () => {
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

  it.skip('should return transaction detail for normal transfer on xdai', async () => {
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

  it.skip('should return error when transactionHash is wrong on  xdai', async () => {
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

  it.skip('should return transaction detail for HNY token transfer on XDAI', async () => {
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

  it.skip('should return transaction detail for GIV token transfer on XDAI', async () => {
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

  it.skip('should return transaction detail for GIV token transfer on XDAI', async () => {
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

  it.skip('should return transaction detail for USDC token transfer on XDAI', async () => {
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
  it.skip('should return error when transaction time is newer than sent timestamp for HNY token transfer on XDAI', async () => {
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
  it.skip(
    'should not return error when transaction time is newer than sent timestamp for HNY token transfer on XDAI,' +
      'And donation is imported or relevant to draft donation',
    async () => {
      // https://blockscout.com/xdai/mainnet/tx/0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4
      const amount = 0.001;
      const txInfo = await getTransactionInfoFromNetwork({
        txHash:
          '0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4',
        symbol: 'HNY',
        networkId: NETWORK_IDS.XDAI,
        fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
        toAddress: '0x5A5a0732c1231D99DB8FFcA38DbEf1c8316fD3E1',
        amount,
        timestamp: 1617903450 + ONE_DAY,
        importedFromDraftOrBackupService: true,
      });
      assert.isNotNull(txInfo);
    },
  );
  it.skip('should return transaction_not_found when it has not being mined before an hour', async () => {
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
  it.skip('should return transaction_not_found_and_nonce_is_used when it has not been mined after an hour', async () => {
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
  // it('should return transaction detail for SOL transfer on Solana #1', async () => {
  //   // https://explorer.solana.com/tx/5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8?cluster=devnet
  //   const amount = 0.001;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8',
  //     symbol: 'SOL',
  //     chainType: ChainType.SOLANA,
  //     networkId: NETWORK_IDS.SOLANA_DEVNET,
  //     fromAddress: '5GECDSGSWmMuw6nMfmdBLapa91ZHDZeHqRP1fqvQokjY',
  //     toAddress: 'DvWdrYYkwyM9mnTetpr3HBHUBKZ22QdbFEXQ8oquE7Zb',
  //     timestamp: 1702931400,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'SOL');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for SOL transfer on Solana #2', async () => {
  //   // https://explorer.solana.com/tx/3nzHwgxAu7mKw1dhGTVmqzY8Yet3kGWWqP5kr5D2fw1HzqPjqDGDe6xT5PguKXk8nAJcK4GpBEKWw7EzoLykKkCx?cluster=devnet
  //   const amount = 1;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '3nzHwgxAu7mKw1dhGTVmqzY8Yet3kGWWqP5kr5D2fw1HzqPjqDGDe6xT5PguKXk8nAJcK4GpBEKWw7EzoLykKkCx',
  //     symbol: 'SOL',
  //     chainType: ChainType.SOLANA,
  //     networkId: NETWORK_IDS.SOLANA_DEVNET,
  //     fromAddress: '9B5XszUGdMaxCZ7uSQhPzdks5ZQSmWxrmzCSvtJ6Ns6g',
  //     toAddress: 'GEhUKKZeENY1TmaavqvLJ5GbbQs9GkzECFSE2bpjzz3k',
  //     timestamp: 1701289800,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'SOL');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return error when transaction time is newer than sent timestamp for SOL transfer on Solana', async () => {
  //   // https://explorer.solana.com/tx/5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8?cluster=devnet

  //   const amount = 0.001;
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '5GQGAgGfMNypB5GN4Pp2t3mEMky89bbpZwNDaDh1LJXopVm3bgSxFUgEJ4tEjf2NdibxX4NiiA752Ya2hzg2nqj8',
  //       symbol: 'SOL',
  //       chainType: ChainType.SOLANA,
  //       networkId: NETWORK_IDS.SOLANA_DEVNET,
  //       fromAddress: '5GECDSGSWmMuw6nMfmdBLapa91ZHDZeHqRP1fqvQokjY',
  //       toAddress: 'DvWdrYYkwyM9mnTetpr3HBHUBKZ22QdbFEXQ8oquE7Zb',
  //       timestamp: 1702931400 + ONE_DAY,
  //       amount,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
  //   );
  // });

  // it('should return transaction detail for spl-token transfer on Solana devnet #1', async () => {
  //   // https://solscan.io/tx/2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16?cluster=devnet
  //   const amount = 7;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16',
  //     symbol: 'TEST-SPL-TOKEN',
  //     chainType: ChainType.SOLANA,
  //     networkId: NETWORK_IDS.SOLANA_DEVNET,
  //     fromAddress: 'BxUK9tDLeMT7AkTR2jBTQQYUxGGw6nuWbQqGtiHHfftn',
  //     toAddress: 'FAMREy7d73N5jPdoKowQ4QFm6DKPWuYxZh6cwjNAbpkY',
  //     timestamp: 1704357745,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'TEST-SPL-TOKEN');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for spl-token transfer on Solana devnet #2', async () => {
  //   // https://solscan.io/tx/3m6f1g2YK6jtbfVfuYsfDbhVzNAqozF8JJyjp1VuFDduecojqeCVK4htKnLTSk3qBwSqYUvgLpBTVpeLJRvNmeTg?cluster=devnet
  //   const amount = 0.00000005;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '3m6f1g2YK6jtbfVfuYsfDbhVzNAqozF8JJyjp1VuFDduecojqeCVK4htKnLTSk3qBwSqYUvgLpBTVpeLJRvNmeTg',
  //     symbol: 'TEST-SPL-TOKEN2',
  //     chainType: ChainType.SOLANA,
  //     networkId: NETWORK_IDS.SOLANA_DEVNET,
  //     fromAddress: '26Aks2rN6mfqxdYRXKZbn8CS4GBv6fCMGFYfGWvfFfcx',
  //     toAddress: '7TJgw4hDHh5wdKep3EsBkGMSvtf9LsxdXf89LA48uHoq',
  //     timestamp: 1704699701,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'TEST-SPL-TOKEN2');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return transaction detail for RAY spl token transfer on Solana mainnet', async () => {
  //   // https://solscan.io/tx/4ApdD7usYH5Cp7hsaWGKjnJW3mfyNpRw4S4NJbzwa2CQfnUkjY11sR2G1W3rvXmCzXwu3yNLz2CfkCHY5sQPdWzq
  //   const amount = 0.005;
  //   const transactionInfo = await getTransactionInfoFromNetwork({
  //     txHash:
  //       '4ApdD7usYH5Cp7hsaWGKjnJW3mfyNpRw4S4NJbzwa2CQfnUkjY11sR2G1W3rvXmCzXwu3yNLz2CfkCHY5sQPdWzq',
  //     symbol: 'RAY',
  //     chainType: ChainType.SOLANA,
  //     networkId: NETWORK_IDS.SOLANA_MAINNET,
  //     fromAddress: 'FAMREy7d73N5jPdoKowQ4QFm6DKPWuYxZh6cwjNAbpkY',
  //     toAddress: '6U29tmuvaGsTQqamf9Vt4o15JHTNq5RdJxoRW6NJxRdx',
  //     timestamp: 1706429516,
  //     amount,
  //   });
  //   assert.isOk(transactionInfo);
  //   assert.equal(transactionInfo.currency, 'RAY');
  //   assert.equal(transactionInfo.amount, amount);
  // });

  // it('should return error when transaction time is newer than sent timestamp for spl-token transfer on Solana', async () => {
  //   // https://explorer.solana.com/tx/2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16?cluster=devnet

  //   const amount = 7;
  //   const badFunc = async () => {
  //     await getTransactionInfoFromNetwork({
  //       txHash:
  //         '2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16',
  //       symbol: 'TEST-SPL-TOKEN',
  //       chainType: ChainType.SOLANA,
  //       networkId: NETWORK_IDS.SOLANA_DEVNET,
  //       fromAddress: 'BxUK9tDLeMT7AkTR2jBTQQYUxGGw6nuWbQqGtiHHfftn',
  //       toAddress: 'FAMREy7d73N5jPdoKowQ4QFm6DKPWuYxZh6cwjNAbpkY',
  //       timestamp: 1704357745 + ONE_DAY,
  //       amount,
  //     });
  //   };
  //   await assertThrowsAsync(
  //     badFunc,
  //     errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
  //   );
  // });
  // it(
  //   'should not return error when transaction time is newer than sent timestamp for spl-token transfer on Solana,' +
  //     'but donation is imported or relevant to draft',
  //   async () => {
  //     // https://explorer.solana.com/tx/2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16?cluster=devnet

  //     const amount = 7;
  //     const transactionInfo = await getTransactionInfoFromNetwork({
  //       txHash:
  //         '2tm14GVsDwXpMzxZzpEWyQnfzcUEv1DZQVQb6VdbsHcV8StoMbBtuQTkW1LJ8RhKKrAL18gbm181NgzuusiQfZ16',
  //       symbol: 'TEST-SPL-TOKEN',
  //       chainType: ChainType.SOLANA,
  //       networkId: NETWORK_IDS.SOLANA_DEVNET,
  //       fromAddress: 'BxUK9tDLeMT7AkTR2jBTQQYUxGGw6nuWbQqGtiHHfftn',
  //       toAddress: 'FAMREy7d73N5jPdoKowQ4QFm6DKPWuYxZh6cwjNAbpkY',
  //       timestamp: 1704357745 + ONE_DAY,
  //       amount,
  //       importedFromDraftOrBackupService: true,
  //     });

  //     assert.isOk(transactionInfo);
  //   },
  // );
}

// function closeToTestCases() {
//   it('should not consider 0.0008436 and 0.0008658 as closed amount', function () {
//     assert.isFalse(closeTo(0.0008436, 0.0008658));
//   });
//   it('should not consider 0.0001 and 0.00011 as closed amount', function () {
//     assert.isFalse(closeTo(0.0001, 0.00011));
//   });
//   it('should not consider 0.001 and 0.003 consider as closed amount', function () {
//     assert.isFalse(closeTo(0.001, 0.003));
//   });
//   it('should  consider 1000.1 and 1000 consider as closed amount', function () {
//     assert.isTrue(closeTo(1000.1, 1000));
//   });
// }
