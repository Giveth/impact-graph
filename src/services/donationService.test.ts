import { assert, expect } from 'chai';
import { CHAIN_ID } from '@giveth/monoswap/dist/src/sdk/sdkFactory';
import moment from 'moment';
import {
  isTokenAcceptableForProject,
  sendNotificationForDonation,
  syncDonationStatusWithBlockchainNetwork,
  updateDonationPricesAndValues,
  insertDonationsFromQfRoundHistory,
} from './donationService';
import { NETWORK_IDS } from '../provider';
import {
  createDonationData,
  createProjectData,
  DONATION_SEED_DATA,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import { Token } from '../entities/token';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { Project } from '../entities/project';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { errorMessages } from '../utils/errorMessages';
import { findDonationById } from '../repositories/donationRepository';
import { findProjectById } from '../repositories/projectRepository';
import { findUserByWalletAddress } from '../repositories/userRepository';
import { QfRound } from '../entities/qfRound';
import {
  fillQfRoundHistory,
  getQfRoundHistoriesThatDontHaveRelatedDonations,
  getQfRoundHistory,
} from '../repositories/qfRoundHistoryRepository';
import { User } from '../entities/user';
import { QfRoundHistory } from '../entities/qfRoundHistory';
import { updateProjectStatistics } from './projectService';

describe('isProjectAcceptToken test cases', isProjectAcceptTokenTestCases);
describe(
  'updateTotalDonationsOfProject test cases',
  fillTotalDonationsOfProjectTestCases,
);
describe(
  'updateOldStableCoinDonationsPrice test cases',
  fillStableCoinDonationsPriceTestCases,
);

describe(
  'syncDonationStatusWithBlockchainNetwork test cases',
  syncDonationStatusWithBlockchainNetworkTestCases,
);
describe(
  'sendSegmentEventForDonation test cases',
  sendSegmentEventForDonationTestCases,
);

describe(
  'insertDonationsFromQfRoundHistory test cases',
  insertDonationsFromQfRoundHistoryTestCases,
);

function sendSegmentEventForDonationTestCases() {
  it.skip('should make segmentNotified true for donation', async () => {
    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    await sendNotificationForDonation({
      donation,
    });
    const updatedDonation = await findDonationById(donation.id);
    assert.isTrue(updatedDonation?.segmentNotified);
  });
}

function syncDonationStatusWithBlockchainNetworkTestCases() {
  // it('should verify a Polygon donation', async () => {
  //   // https://polygonscan.com/tx/0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8

  //   const amount = 30_900;

  //   const transactionInfo = {
  //     txHash:
  //       '0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8',
  //     currency: 'MATIC',
  //     networkId: NETWORK_IDS.POLYGON,
  //     fromAddress: '0x9ead03f7136fc6b4bdb0780b00a1c14ae5a8b6d0',
  //     toAddress: '0x4632e0bcf15db3f4663fea1a6dbf666e563598cd',
  //     amount,
  //     timestamp: 1677400082 * 1000,
  //   };
  //   const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
  //   const project = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     walletAddress: transactionInfo.toAddress,
  //   });
  //   const donation = await saveDonationDirectlyToDb(
  //     {
  //       amount: transactionInfo.amount,
  //       transactionNetworkId: transactionInfo.networkId,
  //       transactionId: transactionInfo.txHash,
  //       currency: transactionInfo.currency,
  //       fromWalletAddress: transactionInfo.fromAddress,
  //       toWalletAddress: transactionInfo.toAddress,
  //       valueUsd: 100,
  //       anonymous: false,
  //       createdAt: new Date(transactionInfo.timestamp),
  //       status: DONATION_STATUS.PENDING,
  //     },
  //     user.id,
  //     project.id,
  //   );
  //   const updateDonation = await syncDonationStatusWithBlockchainNetwork({
  //     donationId: donation.id,
  //   });
  //   assert.isOk(updateDonation);
  //   assert.equal(updateDonation.id, donation.id);
  //   assert.isTrue(updateDonation.segmentNotified);
  //   assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
  // });

  it.skip('should verify a Celo donation', async () => {
    // https://celoscan.io/tx/0xa2a282cf6a7dec8b166aa52ac3d00fcd15a370d414615e29a168cfbb592e3637

    const amount = 0.999;

    const transactionInfo = {
      txHash:
        '0xa2a282cf6a7dec8b166aa52ac3d00fcd15a370d414615e29a168cfbb592e3637',
      currency: 'CELO',
      networkId: NETWORK_IDS.CELO,
      fromAddress: '0xf6436829cf96ea0f8bc49d300c536fcc4f84c4ed',
      toAddress: '0x95b75068b8bc97716a458bedcf4df1cace802c12',
      amount,
      timestamp: 1680072295 * 1000,
    };
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 100,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.isTrue(updateDonation.segmentNotified);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
  });
  it.skip('should verify a Arbitrum donation', async () => {
    // https://arbiscan.io/tx/0xdaca7d68e784a60a6975fa9937abb6b287d7fe992ff806f8c375cb4c3b2152f3

    const amount = 0.0038;

    const transactionInfo = {
      txHash:
        '0xdaca7d68e784a60a6975fa9937abb6b287d7fe992ff806f8c375cb4c3b2152f3',
      currency: 'ETH',
      networkId: NETWORK_IDS.ARBITRUM_MAINNET,
      fromAddress: '0x015e6fbce5119c32db66e7c544365749bb26cf8b',
      toAddress: '0x5c66fef6ea22f37e7c1f7eee49e4e116d3fbfc68',
      amount,
      timestamp: 1708342629 * 1000,
    };
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 100,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.isTrue(updateDonation.segmentNotified);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
  });
  it.skip('should verify a erc20 Arbitrum donation', async () => {
    // https://arbiscan.io/tx/0xd7ba5a5d8149432217a161559e357904965620b58e776c4482b8b501e092e495

    const amount = 999.2;

    const transactionInfo = {
      txHash:
        '0xd7ba5a5d8149432217a161559e357904965620b58e776c4482b8b501e092e495',
      currency: 'USDT',
      networkId: NETWORK_IDS.ARBITRUM_MAINNET,
      fromAddress: '0x62383739d68dd0f844103db8dfb05a7eded5bbe6',
      toAddress: '0x513b8c84fb6e36512b641b67de55a18704118fe7',
      amount,
      timestamp: 1708343905 * 1000,
    };
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 1000,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.isTrue(updateDonation.segmentNotified);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
  });
  // it('should verify a Arbitrum Sepolia donation', async () => {
  //   // https://sepolia.arbiscan.io/tx/0x25f17541ccb7248d931f2a1e11058a51ffb4db4968ed3e1d4a019ddc2d44802c

  //   const amount = 0.0069;

  //   const transactionInfo = {
  //     txHash:
  //       '0x25f17541ccb7248d931f2a1e11058a51ffb4db4968ed3e1d4a019ddc2d44802c',
  //     currency: 'ETH',
  //     networkId: NETWORK_IDS.ARBITRUM_SEPOLIA,
  //     fromAddress: '0xefc58dbf0e606c327868b55334998aacb27f9ef2',
  //     toAddress: '0xc11c479473cd06618fc75816dd6b56be4ac80efd',
  //     amount,
  //     timestamp: 1708344659 * 1000,
  //   };
  //   const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
  //   const project = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     walletAddress: transactionInfo.toAddress,
  //   });
  //   const donation = await saveDonationDirectlyToDb(
  //     {
  //       amount: transactionInfo.amount,
  //       transactionNetworkId: transactionInfo.networkId,
  //       transactionId: transactionInfo.txHash,
  //       currency: transactionInfo.currency,
  //       fromWalletAddress: transactionInfo.fromAddress,
  //       toWalletAddress: transactionInfo.toAddress,
  //       valueUsd: 100,
  //       anonymous: false,
  //       createdAt: new Date(transactionInfo.timestamp),
  //       status: DONATION_STATUS.PENDING,
  //     },
  //     user.id,
  //     project.id,
  //   );
  //   const updateDonation = await syncDonationStatusWithBlockchainNetwork({
  //     donationId: donation.id,
  //   });
  //   assert.isOk(updateDonation);
  //   assert.equal(updateDonation.id, donation.id);
  //   assert.isTrue(updateDonation.segmentNotified);
  //   assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
  // });
  // it('should verify a erc20 Arbitrum Sepolia donation', async () => {
  //   // https://sepolia.arbiscan.io/tx/0x5bcce1bac54ee92ff28e9913e8a002e6e8efc8e8632fdb8e6ebaa16d8c6fd4cb

  //   const amount = 100;

  //   const transactionInfo = {
  //     txHash:
  //       '0x5bcce1bac54ee92ff28e9913e8a002e6e8efc8e8632fdb8e6ebaa16d8c6fd4cb',
  //     currency: 'cETH',
  //     networkId: NETWORK_IDS.ARBITRUM_SEPOLIA,
  //     fromAddress: '0x6a446d9d0d153aa07811de2ac8096b87baad305b',
  //     toAddress: '0xf888186663aae1600282c6fb23b764a61937b913',
  //     amount,
  //     timestamp: 1708344801 * 1000,
  //   };
  //   const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
  //   const project = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     walletAddress: transactionInfo.toAddress,
  //   });
  //   const donation = await saveDonationDirectlyToDb(
  //     {
  //       amount: transactionInfo.amount,
  //       transactionNetworkId: transactionInfo.networkId,
  //       transactionId: transactionInfo.txHash,
  //       currency: transactionInfo.currency,
  //       fromWalletAddress: transactionInfo.fromAddress,
  //       toWalletAddress: transactionInfo.toAddress,
  //       valueUsd: 1000,
  //       anonymous: false,
  //       createdAt: new Date(transactionInfo.timestamp),
  //       status: DONATION_STATUS.PENDING,
  //     },
  //     user.id,
  //     project.id,
  //   );
  //   const updateDonation = await syncDonationStatusWithBlockchainNetwork({
  //     donationId: donation.id,
  //   });
  //   assert.isOk(updateDonation);
  //   assert.equal(updateDonation.id, donation.id);
  //   assert.isTrue(updateDonation.segmentNotified);
  //   assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
  // });
  it.skip('should verify a Optimistic donation', async () => {
    // https://optimistic.etherscan.io/tx/0xc645bd4ebcb1cb249be4b3e4dad46075c973fd30649a39f27f5328ded15074e7

    const amount = 0.001;

    const transactionInfo = {
      txHash:
        '0xc645bd4ebcb1cb249be4b3e4dad46075c973fd30649a39f27f5328ded15074e7',
      currency: 'ETH',
      networkId: NETWORK_IDS.OPTIMISTIC,
      fromAddress: '0xf23ea0b5f14afcbe532a1df273f7b233ebe41c78',
      toAddress: '0xf23ea0b5f14afcbe532a1df273f7b233ebe41c78',
      amount,
      timestamp: 1679484540 * 1000,
    };
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 1.79,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
    assert.isTrue(updateDonation.segmentNotified);
  });

  it.skip('should verify a Optimism Sepolia donation', async () => {
    // https://sepolia-optimism.etherscan.io/tx/0x1b4e9489154a499cd7d0bd7a097e80758e671a32f98559be3b732553afb00809
    const amount = 0.01;

    const transactionInfo = {
      txHash:
        '0x1b4e9489154a499cd7d0bd7a097e80758e671a32f98559be3b732553afb00809',
      currency: 'ETH',
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      fromAddress: '0x625bcc1142e97796173104a6e817ee46c593b3c5',
      toAddress: '0x73f9b3f48ebc96ac55cb76c11053b068669a8a67',
      amount,
      timestamp: 1708954960 * 1000,
    };
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 20.73,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
    assert.isTrue(updateDonation.segmentNotified);
  });

  // it('should verify a mainnet donation', async () => {
  //   // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
  //   const transactionInfo = {
  //     txHash:
  //       '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
  //     currency: 'ETH',
  //     networkId: NETWORK_IDS.MAIN_NET,
  //     fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
  //     toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
  //     timestamp: 1607360947 * 1000,
  //     amount: 0.04,
  //   };

  //   const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
  //   const project = await saveProjectDirectlyToDb({
  //     ...createProjectData(),
  //     walletAddress: transactionInfo.toAddress,
  //   });
  //   const donation = await saveDonationDirectlyToDb(
  //     {
  //       amount: transactionInfo.amount,
  //       transactionNetworkId: transactionInfo.networkId,
  //       transactionId: transactionInfo.txHash,
  //       currency: transactionInfo.currency,
  //       fromWalletAddress: transactionInfo.fromAddress,
  //       toWalletAddress: transactionInfo.toAddress,
  //       valueUsd: 100,
  //       anonymous: false,
  //       createdAt: new Date(transactionInfo.timestamp),
  //       status: DONATION_STATUS.PENDING,
  //     },
  //     user.id,
  //     project.id,
  //   );
  //   const updateDonation = await syncDonationStatusWithBlockchainNetwork({
  //     donationId: donation.id,
  //   });
  //   assert.isOk(updateDonation);
  //   assert.equal(updateDonation.id, donation.id);
  //   assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
  //   assert.isTrue(updateDonation.segmentNotified);
  // });

  it.skip('should verify a gnosis donation', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c734

    const transactionInfo = {
      txHash:
        '0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c734',
      currency: 'XDAI',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0xb20a327c9b4da091f454b1ce0e2e4dc5c128b5b4',
      toAddress: '0x7ee789b7e6fa20eab7ecbce44626afa7f58a94b7',
      amount: 0.001,
      timestamp: 1621241124 * 1000,
    };

    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 100,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
    assert.isTrue(updateDonation.segmentNotified);
  });

  it.skip('should change status to failed when donation fromAddress is different with transaction fromAddress', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4

    const transactionInfo = {
      txHash:
        '0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4',
      currency: 'HNY',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732000',
      toAddress: '0x5A5a0732c1231D99DB8FFcA38DbEf1c8316fD3E1',
      amount: 0.001,
      timestamp: 1617903449 * 1000,
    };

    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 100,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.equal(updateDonation.status, DONATION_STATUS.FAILED);
    assert.equal(
      updateDonation?.verifyErrorMessage,
      errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
    );
  });

  it.skip('should change status to failed when donation toAddress is different with transaction toAddress', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0xe3b05b89f71b63e385c4971be872a9becd18f696b1e8abaddbc29c1cce59da63
    const transactionInfo = {
      txHash:
        '0xe3b05b89f71b63e385c4971be872a9becd18f696b1e8abaddbc29c1cce59da63',
      currency: 'GIV',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x89E12F054526B985188b946063dDc874a62fEd45',
      toAddress: '0xECb179EA5910D652eDa6988E919c7930F5Ffcf00',
      amount: 1500,
      timestamp: 1640408645 * 1000,
    };

    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 100,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.equal(updateDonation.status, DONATION_STATUS.FAILED);
    assert.equal(
      updateDonation?.verifyErrorMessage,
      errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
    );
  });

  it.skip('should change status to failed when donation is very newer than transaction', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x00aef89fc40cea0cc0cb7ae5ac18c0e586dccb200b230a9caabca0e08ff7a36b
    const transactionInfo = {
      txHash:
        '0x00aef89fc40cea0cc0cb7ae5ac18c0e586dccb200b230a9caabca0e08ff7a36b',
      currency: 'USDC',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
      toAddress: '0x87f1c862c166b0ceb79da7ad8d0864d53468d076',
      amount: 1,
    };
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 100,
        anonymous: false,
        createdAt: new Date(),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.equal(updateDonation.status, DONATION_STATUS.FAILED);
    assert.equal(
      updateDonation?.verifyErrorMessage,
      errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
    );
  });
  it.skip(
    'should change status to verified when donation is very newer than transaction' +
      ' but tx is imported or relevant to draft donation',
    async () => {
      // https://blockscout.com/xdai/mainnet/tx/0x00aef89fc40cea0cc0cb7ae5ac18c0e586dccb200b230a9caabca0e08ff7a36b
      const transactionInfo = {
        txHash:
          '0x00aef89fc40cea0cc0cb7ae5ac18c0e586dccb200b230a9caabca0e08ff7a36b',
        currency: 'USDC',
        networkId: NETWORK_IDS.XDAI,
        fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
        toAddress: '0x87f1c862c166b0ceb79da7ad8d0864d53468d076',
        amount: 1,
      };
      const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
      const project = await saveProjectDirectlyToDb({
        ...createProjectData(),
        walletAddress: transactionInfo.toAddress,
      });
      const donation = await saveDonationDirectlyToDb(
        {
          amount: transactionInfo.amount,
          transactionNetworkId: transactionInfo.networkId,
          transactionId: transactionInfo.txHash,
          currency: transactionInfo.currency,
          fromWalletAddress: transactionInfo.fromAddress,
          toWalletAddress: transactionInfo.toAddress,
          valueUsd: 100,
          anonymous: false,
          createdAt: new Date(),
          status: DONATION_STATUS.PENDING,
        },
        user.id,
        project.id,
      );
      donation.importDate = new Date();
      await donation.save();
      const updateDonation = await syncDonationStatusWithBlockchainNetwork({
        donationId: donation.id,
      });
      assert.isOk(updateDonation);
      assert.equal(updateDonation.id, donation.id);
      assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
    },
  );
}

function isProjectAcceptTokenTestCases() {
  it.skip('should return true for giveth projects accepting GIV on xdai', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'GIV',
        networkId: NETWORK_IDS.XDAI,
      },
    });
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it.skip('should return true for giveth projects accepting GIV on mainnet', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'GIV',
        networkId: NETWORK_IDS.MAIN_NET,
      },
    });
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it.skip('should return true for giveth projects accepting WETH on xdai', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'WETH',
        networkId: NETWORK_IDS.XDAI,
      },
    });
    const project = await saveProjectDirectlyToDb(createProjectData());
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it.skip('should return true for trace projects accepting GIV on xdai', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'GIV',
        networkId: NETWORK_IDS.XDAI,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it.skip('should return true for trace projects accepting GIV on mainnet', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'GIV',
        networkId: NETWORK_IDS.MAIN_NET,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it.skip('should return true for trace projects accepting WETH on xdai', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'WETH',
        networkId: NETWORK_IDS.XDAI,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it.skip('should return true for endaoment projects accepting ETH on mainnet', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'ETH',
        networkId: NETWORK_IDS.MAIN_NET,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.ENDAOMENT,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it.skip('should return false for endaoment projects accepting GIV on xdai', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'GIV',
        networkId: NETWORK_IDS.XDAI,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.ENDAOMENT,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
  it.skip('should return false for endaoment projects accepting XDAI on xdai', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'XDAI',
        networkId: NETWORK_IDS.XDAI,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.ENDAOMENT,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
  it.skip('should return false for endaoment projects accepting GIV on mainnet', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'GIV',
        networkId: NETWORK_IDS.MAIN_NET,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.ENDAOMENT,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
}

function fillTotalDonationsOfProjectTestCases() {
  it.skip('should not change updatedAt', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await updateProjectStatistics(project.id);
    const updatedProject = (await findProjectById(project.id)) as Project;
    assert.equal(
      new Date(project.updatedAt).getTime(),
      new Date(updatedProject.updatedAt).getTime(),
    );
  });

  it.skip('should update totalDonations of project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donation = await saveDonationDirectlyToDb(
      DONATION_SEED_DATA.FIRST_DONATION,
      SEED_DATA.FIRST_USER.id,
      project.id,
    );
    await updateProjectStatistics(project.id);
    const updatedProject = (await findProjectById(project.id)) as Project;
    assert.equal(updatedProject.totalDonations, donation.valueUsd);
    assert.equal(
      new Date(updatedProject.updatedAt).getTime(),
      new Date(project.updatedAt).getTime(),
    );
  });
}

function fillStableCoinDonationsPriceTestCases() {
  it.skip('should fill price for Matic donation on the Polygon network', async () => {
    const token = 'MATIC';
    const amount = 100;
    let donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        currency: token,
        valueUsd: undefined,
        valueEth: undefined,
        amount,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    const project = (await Project.findOne({
      where: { id: SEED_DATA.FIRST_PROJECT.id },
    })) as Project;
    await updateDonationPricesAndValues(
      donation,
      project,
      { symbol: token },
      CHAIN_ID.POLYGON,
    );

    donation = (await findDonationById(donation.id))!;
    expect(donation.valueUsd).to.gt(0);
  });

  it.skip('should fill price for Celo donation on the CELO network', async () => {
    const token = 'CELO';
    const amount = 100;
    let donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        currency: token,
        valueUsd: undefined,
        valueEth: undefined,
        amount,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    const project = (await Project.findOne({
      where: { id: SEED_DATA.FIRST_PROJECT.id },
    })) as Project;

    await updateDonationPricesAndValues(
      donation,
      project,
      { symbol: token },
      CHAIN_ID.CELO,
    );
    donation = (await findDonationById(donation.id))!;
    expect(donation.valueUsd).to.gt(0);
  });

  it.skip('should fill price for mpETH donation on the MAINNET network', async () => {
    const currency = 'mpETH';
    const tokenAddress = '0x48afbbd342f64ef8a9ab1c143719b63c2ad81710';
    const amount = 2;
    const transactionNetworkId = NETWORK_IDS.MAIN_NET;
    let donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        tokenAddress,
        transactionNetworkId,
        currency,
        valueUsd: undefined,
        valueEth: undefined,
        amount,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    const project = (await Project.findOne({
      where: { id: SEED_DATA.FIRST_PROJECT.id },
    })) as Project;

    const token = await Token.findOneBy({
      networkId: transactionNetworkId,
      address: tokenAddress,
    });

    await updateDonationPricesAndValues(
      donation,
      project,
      token!,
      CHAIN_ID.MAINNET,
    );
    donation = (await findDonationById(donation.id))!;
    expect(donation.valueUsd).to.gt(0);
    expect(donation.priceUsd).to.below(donation.valueUsd);
  });

  it.skip('should fill price for mpETH donation on the OPTIMISM network', async () => {
    const currency = 'mpETH';
    const tokenAddress = '0x819845b60a192167ed1139040b4f8eca31834f27';
    const amount = 2;
    const transactionNetworkId = NETWORK_IDS.OPTIMISTIC;
    let donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        tokenAddress,
        transactionNetworkId,
        currency,
        valueUsd: undefined,
        valueEth: undefined,
        amount,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    const project = (await Project.findOne({
      where: { id: SEED_DATA.FIRST_PROJECT.id },
    })) as Project;

    const token = await Token.findOneBy({
      networkId: transactionNetworkId,
      address: tokenAddress,
    });

    await updateDonationPricesAndValues(
      donation,
      project,
      token!,
      CHAIN_ID.MAINNET,
    );
    donation = (await findDonationById(donation.id))!;
    expect(donation.valueUsd).to.gt(0);
    expect(donation.priceUsd).to.below(donation.valueUsd);
  });

  // it('should fill price for Celo donation on the CELO Alfajores network', async () => {
  //   const token = 'CELO';
  //   const amount = 100;
  //   let donation = await saveDonationDirectlyToDb(
  //     {
  //       ...createDonationData(),
  //       currency: token,
  //       valueUsd: undefined,
  //       valueEth: undefined,
  //       amount,
  //     },
  //     SEED_DATA.FIRST_USER.id,
  //     SEED_DATA.FIRST_PROJECT.id,
  //   );

  //   const project = (await Project.findOne({
  //     where: { id: SEED_DATA.FIRST_PROJECT.id },
  //   })) as Project;

  //   await updateDonationPricesAndValues(
  //     donation,
  //     project,
  //     { symbol: token },
  //     CHAIN_ID.ALFAJORES,
  //   );

  //   donation = (await findDonationById(donation.id))!;
  //   expect(donation.valueUsd).to.gt(0);
  // });
}

function insertDonationsFromQfRoundHistoryTestCases() {
  // We should write lots of test cases to cover all edge cases, now I just has written
  // one test case because this task has high priority and I must have doe it soon
  let qfRound: QfRound;
  let firstProject: Project;
  let projectOwner: User;
  beforeEach(async () => {
    await QfRound.update({}, { isActive: false });
    qfRound = QfRound.create({
      isActive: true,
      name: 'test',
      slug: new Date().getTime().toString(),
      allocatedFund: 100,
      minimumPassportScore: 8,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    projectOwner = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    firstProject = await saveProjectDirectlyToDb(
      createProjectData(),
      projectOwner,
    );

    firstProject.qfRounds = [qfRound];

    await firstProject.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it.skip('should return correct value for single project', async () => {
    // First call it to make sure there isn't any thing in DB to make conflicts in our test cases
    await QfRoundHistory.clear();

    const usersDonations: number[][] = [
      [1, 3], // 4
      [2, 23], // 25
      [3, 97], // 100
    ];

    await Promise.all(
      usersDonations.map(async valuesUsd => {
        const user = await saveUserDirectlyToDb(
          generateRandomEtheriumAddress(),
        );
        user.passportScore = 10;
        await user.save();
        return Promise.all(
          valuesUsd.map(valueUsd => {
            return saveDonationDirectlyToDb(
              {
                ...createDonationData(),
                valueUsd,
                qfRoundId: qfRound.id,
                status: 'verified',
              },
              user.id,
              firstProject.id,
            );
          }),
        );
      }),
    );

    // if want to fill history round end date should be passed and be inactive
    qfRound.endDate = moment().subtract(1, 'days').toDate();
    qfRound.isActive = false;
    await qfRound.save();

    await fillQfRoundHistory();
    const matchingFundFromAddress = process.env
      .MATCHING_FUND_DONATIONS_FROM_ADDRESS as string;
    const matchingFundFromUser = await findUserByWalletAddress(
      matchingFundFromAddress,
    );
    assert.isNotNull(
      matchingFundFromAddress,
      'Should define MATCHING_FUND_DONATIONS_FROM_ADDRESS in process.env',
    );
    const qfRoundHistory = await getQfRoundHistory({
      projectId: firstProject.id,
      qfRoundId: qfRound.id,
    });
    assert.isNotNull(qfRoundHistory);
    // https://blockscout.com/xdai/mainnet/tx/0x42c0f15029557ec35e61515a89366297fc239a334e3ba22fab15a3f1d04ad53f
    qfRoundHistory!.distributedFundTxHash =
      '0x42c0f15029557ec35e61515a89366297fc239a334e3ba22fab15a3f1d04ad53f';
    qfRoundHistory!.distributedFundNetwork = '100';
    qfRoundHistory!.matchingFundAmount = 1000;
    qfRoundHistory!.matchingFundCurrency = 'DAI';
    qfRoundHistory!.matchingFund = 1000;
    await qfRoundHistory?.save();

    const inCompleteQfRoundHistories =
      await getQfRoundHistoriesThatDontHaveRelatedDonations();
    assert.isNotNull(
      inCompleteQfRoundHistories.find(
        item =>
          item.projectId === firstProject.id && item.qfRoundId === qfRound.id,
      ),
    );

    await insertDonationsFromQfRoundHistory();

    const updatedMatchingFundFromUser = await findUserByWalletAddress(
      matchingFundFromAddress,
    );
    assert.equal(
      updatedMatchingFundFromUser?.totalDonated,
      (Number(matchingFundFromUser?.totalDonated) as number) +
        Number(qfRoundHistory?.matchingFund),
    );
    assert.equal(
      updatedMatchingFundFromUser?.totalReceived,
      matchingFundFromUser?.totalReceived,
    );

    const inCompleteQfRoundHistories2 =
      await getQfRoundHistoriesThatDontHaveRelatedDonations();
    assert.isUndefined(
      inCompleteQfRoundHistories2.find(
        item =>
          item.projectId === firstProject.id && item.qfRoundId === qfRound.id,
      ),
    );

    const donations = await Donation.find({
      where: {
        fromWalletAddress: matchingFundFromAddress,
        projectId: firstProject.id,
      },
    });
    assert.equal(donations.length, 1);
    assert.equal(donations[0].distributedFundQfRoundId, qfRound.id);
    assert.equal(donations[0].projectId, firstProject.id);
    assert.equal(donations[0].valueUsd, qfRoundHistory?.matchingFund);
    assert.equal(donations[0].currency, qfRoundHistory?.matchingFundCurrency);
    assert.equal(donations[0].amount, qfRoundHistory?.matchingFundAmount);
    assert.equal(
      donations[0].transactionNetworkId,
      Number(qfRoundHistory?.distributedFundNetwork),
    );
    assert.equal(
      donations[0].transactionId,
      qfRoundHistory?.distributedFundTxHash,
    );
    assert.equal(donations[0].createdAt.getTime(), 1702091620000);

    const updatedProject = await findProjectById(firstProject.id);
    assert.equal(
      updatedProject?.totalDonations,
      4 + 25 + 100 + qfRoundHistory!.matchingFund,
    );
    assert.equal(
      updatedProject?.adminUser?.totalReceived,
      4 + 25 + 100 + qfRoundHistory!.matchingFund,
    );
  });
}
