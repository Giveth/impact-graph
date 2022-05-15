import { assert } from 'chai';
import {
  isTokenAcceptableForProject,
  updateOldStableCoinDonationsPrice,
  sendSegmentEventForDonation,
  syncDonationStatusWithBlockchainNetwork,
  updateTotalDonationsOfProject,
} from './donationService';
import { NETWORK_IDS } from '../provider';
import {
  createDonationData,
  createProjectData,
  DONATION_SEED_DATA,
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
    const updatedDonation = await Donation.findOne({ id: donation.id });
    assert.isTrue(updatedDonation?.segmentNotified);
  });
}

function syncDonationStatusWithBlockchainNetworkTestCases() {
  it('should verify a ropsten donation', async () => {
    // https://ropsten.etherscan.io/tx/0xba3c2627c9d3dd963455648b4f9d7239e8b5c80d0aa85ac354d2b762d99e4441

    const transactionInfo = {
      txHash:
        '0xba3c2627c9d3dd963455648b4f9d7239e8b5c80d0aa85ac354d2b762d99e4441',
      networkId: NETWORK_IDS.ROPSTEN,
      amount: 0.01,
      fromAddress: '0x826976d7c600d45fb8287ca1d7c76fc8eb732030',
      toAddress: '0x8f951903c9360345b4e1b536c7f5ae8f88a64e79',
      currency: 'UNI',
      timestamp: 1615739937,
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

  it('should verify a mainnet donation', async () => {
    // https://etherscan.io/tx/0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a
    const transactionInfo = {
      txHash:
        '0x37765af1a7924fb6ee22c83668e55719c9ecb1b79928bd4b208c42dfff44da3a',
      currency: 'ETH',
      networkId: NETWORK_IDS.MAIN_NET,
      fromAddress: '0x839395e20bbB182fa440d08F850E6c7A8f6F0780',
      toAddress: '0x5ac583feb2b1f288c0a51d6cdca2e8c814bfe93b',
      timestamp: 1607360947,
      amount: 0.04,
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
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
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
      symbol: 'GIV',
      networkId: NETWORK_IDS.MAIN_NET,
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
      symbol: 'WETH',
      networkId: NETWORK_IDS.XDAI,
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
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
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
      symbol: 'GIV',
      networkId: NETWORK_IDS.MAIN_NET,
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
      symbol: 'WETH',
      networkId: NETWORK_IDS.XDAI,
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
      symbol: 'ETH',
      networkId: NETWORK_IDS.MAIN_NET,
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
      symbol: 'GIV',
      networkId: NETWORK_IDS.XDAI,
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
      symbol: 'XDAI',
      networkId: NETWORK_IDS.XDAI,
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
      symbol: 'GIV',
      networkId: NETWORK_IDS.MAIN_NET,
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
    const updatedProject = (await Project.findOne({
      id: project.id,
    })) as Project;
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
    const updatedProject = (await Project.findOne({
      id: project.id,
    })) as Project;
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
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    assert.isNotOk(donation.valueUsd);
    await updateOldStableCoinDonationsPrice();
    const updatedDonation = await Donation.findOne(donation.id);
    assert.equal(updatedDonation?.valueUsd, updatedDonation?.amount);
    assert.equal(updatedDonation?.priceUsd, 1);
  });
}
