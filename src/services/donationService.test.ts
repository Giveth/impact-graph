import { assert, expect } from 'chai';
import {
  isTokenAcceptableForProject,
  updateOldStableCoinDonationsPrice,
  sendSegmentEventForDonation,
  syncDonationStatusWithBlockchainNetwork,
  updateTotalDonationsOfProject,
  updateDonationPricesAndValues,
  insertDonationsFromQfRoundHistory,
} from './donationService';
import { NETWORK_IDS } from '../provider';
import {
  createDonationData,
  createProjectData,
  DONATION_SEED_DATA,
  generateRandomEtheriumAddress,
  generateRandomTxHash,
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
import { CHAIN_ID } from '@giveth/monoswap/dist/src/sdk/sdkFactory';
import {
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import { QfRound } from '../entities/qfRound';
import moment from 'moment';
import {
  fillQfRoundHistory,
  getQfRoundHistoriesThatDontHaveRelatedDonations,
  getQfRoundHistory,
} from '../repositories/qfRoundHistoryRepository';
import { User } from '../entities/user';
import { QfRoundHistory } from '../entities/qfRoundHistory';

describe('isProjectAcceptToken test cases', isProjectAcceptTokenTestCases);
describe(
  'updateTotalDonationsOfProject test cases',
  fillTotalDonationsOfProjectTestCases,
);
describe(
  'updateOldStableCoinDonationsPrice test cases',
  fillOldStableCoinDonationsPriceTestCases,
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
  it('should make segmentNotified true for donation', async () => {
    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    await sendSegmentEventForDonation({
      donation,
    });
    const updatedDonation = await findDonationById(donation.id);
    assert.isTrue(updatedDonation?.segmentNotified);
  });
}

function syncDonationStatusWithBlockchainNetworkTestCases() {
  it('should verify a goerli donation and update donor.totalDonated and projectOwner.totalReceived', async () => {
    // https://goerli.etherscan.io/tx/0x43cb1c61a81f007abd3de766a6029ffe62d0324268d7781469a3d7879d487cb1

    const transactionInfo = {
      txHash:
        '0x43cb1c61a81f007abd3de766a6029ffe62d0324268d7781469a3d7879d487cb1',
      networkId: NETWORK_IDS.GOERLI,
      amount: 0.117,
      fromAddress: '0xc18c3cc1cf44e72dedfcbae981ef1ab32256ee60',
      toAddress: '0x2d2b642c7407ebce201ed80711124fffd1777331',
      currency: 'ETH',
      timestamp: 1661114988,
    };
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const projectOwner = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(
      {
        ...createProjectData(),
        walletAddress: transactionInfo.toAddress,
      },
      projectOwner,
    );
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

    const donor = await findUserById(user.id);
    assert.equal(donor?.totalDonated, 100);

    const updatedProjectOwner = await findUserById(projectOwner.id);
    assert.equal(updatedProjectOwner?.totalReceived, 100);
  });

  it('should verify a Polygon donation', async () => {
    // https://polygonscan.com/tx/0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8

    const amount = 30_900;

    const transactionInfo = {
      txHash:
        '0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8',
      currency: 'MATIC',
      networkId: NETWORK_IDS.POLYGON,
      fromAddress: '0x9ead03f7136fc6b4bdb0780b00a1c14ae5a8b6d0',
      toAddress: '0x4632e0bcf15db3f4663fea1a6dbf666e563598cd',
      amount,
      timestamp: 1677400082,
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

  it('should verify a Celo donation', async () => {
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
      timestamp: 1680072295,
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
  it('should verify a Optimistic donation', async () => {
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
      timestamp: 1679484540,
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

  it('should verify a Optimism Goerli donation', async () => {
    // https://goerli-optimism.etherscan.io/tx/0x95acfc3a5d1adbc9a4584d6bf92e9dfde48087fe54c2b750b067be718215ffc3
    const amount = 0.011;

    const transactionInfo = {
      txHash:
        '0x95acfc3a5d1adbc9a4584d6bf92e9dfde48087fe54c2b750b067be718215ffc3',
      currency: 'ETH',
      networkId: NETWORK_IDS.OPTIMISM_GOERLI,
      fromAddress: '0x317bbc1927be411cd05615d2ffdf8d320c6c4052',
      toAddress: '0x00d18ca9782be1caef611017c2fbc1a39779a57c',
      amount,
      timestamp: 1679484540,
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
  //     timestamp: 1607360947,
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

  it('should verify a gnosis donation', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c734

    const transactionInfo = {
      txHash:
        '0x57b913ac40b2027a08655bdb495befc50612b72a9dd1f2be81249c970503c734',
      currency: 'XDAI',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0xb20a327c9b4da091f454b1ce0e2e4dc5c128b5b4',
      toAddress: '0x7ee789b7e6fa20eab7ecbce44626afa7f58a94b7',
      amount: 0.001,
      timestamp: 1621241124,
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

  it('should change status to failed when donation fromAddress is different with transaction fromAddress', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4

    const transactionInfo = {
      txHash:
        '0x99e70642fe1aa03cb2db35c3e3909466e66b233840b7b1e0dd47296c878c16b4',
      currency: 'HNY',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732000',
      toAddress: '0x5A5a0732c1231D99DB8FFcA38DbEf1c8316fD3E1',
      amount: 0.001,
      timestamp: 1617903449,
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

  it('should change status to failed when donation toAddress is different with transaction toAddress', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0xe3b05b89f71b63e385c4971be872a9becd18f696b1e8abaddbc29c1cce59da63
    const transactionInfo = {
      txHash:
        '0xe3b05b89f71b63e385c4971be872a9becd18f696b1e8abaddbc29c1cce59da63',
      currency: 'GIV',
      networkId: NETWORK_IDS.XDAI,
      fromAddress: '0x89E12F054526B985188b946063dDc874a62fEd45',
      toAddress: '0xECb179EA5910D652eDa6988E919c7930F5Ffcf00',
      amount: 1500,
      timestamp: 1640408645,
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

  it('should change status to failed when donation is very newer than transaction', async () => {
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
}

function isProjectAcceptTokenTestCases() {
  it('should return true for giveth projects accepting GIV on xdai', async () => {
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
  it('should return true for giveth projects accepting GIV on mainnet', async () => {
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
  it('should return true for giveth projects accepting WETH on xdai', async () => {
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
  it('should return true for trace projects accepting GIV on xdai', async () => {
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
  it('should return true for trace projects accepting GIV on mainnet', async () => {
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
  it('should return true for trace projects accepting WETH on xdai', async () => {
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
  it('should return true for givingBlock projects accepting ETH on mainnet', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'ETH',
        networkId: NETWORK_IDS.MAIN_NET,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isTrue(result);
  });
  it('should return false for givingblock projects accepting GIV on xdai', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'GIV',
        networkId: NETWORK_IDS.XDAI,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
  it('should return false for givingblock projects accepting XDAI on xdai', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'XDAI',
        networkId: NETWORK_IDS.XDAI,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
  it('should return false for givingblock projects accepting GIV on mainnet', async () => {
    const token = await Token.findOne({
      where: {
        symbol: 'GIV',
        networkId: NETWORK_IDS.MAIN_NET,
      },
    });
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const result = await isTokenAcceptableForProject({
      projectId: project.id,
      tokenId: token?.id as number,
    });
    assert.isFalse(result);
  });
}

function fillTotalDonationsOfProjectTestCases() {
  it('should not change updatedAt', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await updateTotalDonationsOfProject(project.id);
    const updatedProject = (await findProjectById(project.id)) as Project;
    assert.equal(
      new Date(project.updatedAt).getTime(),
      new Date(updatedProject.updatedAt).getTime(),
    );
  });

  it('should update totalDonations of project', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donation = await saveDonationDirectlyToDb(
      DONATION_SEED_DATA.FIRST_DONATION,
      SEED_DATA.FIRST_USER.id,
      project.id,
    );
    await updateTotalDonationsOfProject(project.id);
    const updatedProject = (await findProjectById(project.id)) as Project;
    assert.equal(updatedProject.totalDonations, donation.valueUsd);
    assert.equal(
      new Date(updatedProject.updatedAt).getTime(),
      new Date(project.updatedAt).getTime(),
    );
  });
}

function fillOldStableCoinDonationsPriceTestCases() {
  it('should fill price for XDAI donation that already doesnt have price', async () => {
    const donation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        currency: 'XDAI',
        valueUsd: undefined,
        amount: 100,
        transactionNetworkId: NETWORK_IDS.XDAI,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    assert.isNotOk(donation.valueUsd);
    await updateOldStableCoinDonationsPrice();
    const updatedDonation = await findDonationById(donation.id);
    assert.equal(updatedDonation?.valueUsd, updatedDonation?.amount);
    assert.equal(updatedDonation?.priceUsd, 1);
  });

  it('should fill price for Matic donation on the Polygon network', async () => {
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
      null,
      token,
      CHAIN_ID.POLYGON,
      amount,
    );

    donation = (await findDonationById(donation.id))!;
    expect(donation.valueUsd).to.gt(0);
  });

  it('should fill price for Celo donation on the CELO network', async () => {
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
      null,
      token,
      CHAIN_ID.CELO,
      amount,
    );
    donation = (await findDonationById(donation.id))!;
    expect(donation.valueUsd).to.gt(0);
  });

  it('should fill price for Celo donation on the CELO Alfajores network', async () => {
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
      null,
      token,
      CHAIN_ID.ALFAJORES,
      amount,
    );

    donation = (await findDonationById(donation.id))!;
    expect(donation.valueUsd).to.gt(0);
  });
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

  it('should return correct value for single project', async () => {
    // First call it to make sure there isnt any thing in DB to make conflicts in our test cases
    await insertDonationsFromQfRoundHistory();

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
    qfRoundHistory!.distributedFundTxHash = generateRandomTxHash();
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
