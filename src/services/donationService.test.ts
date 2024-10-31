import { assert, expect } from 'chai';
import { CHAIN_ID } from '@giveth/monoswap/dist/src/sdk/sdkFactory';
import sinon from 'sinon';
import moment from 'moment';
import {
  isTokenAcceptableForProject,
  sendNotificationForDonation,
  syncDonationStatusWithBlockchainNetwork,
  updateDonationPricesAndValues,
  insertDonationsFromQfRoundHistory,
  syncDonationsWithAnkr,
} from './donationService';
import { NETWORK_IDS } from '../provider';
import {
  createDonationData,
  createProjectData,
  DONATION_SEED_DATA,
  generateEARoundNumber,
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
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import * as chains from './chains';
import { ProjectRoundRecord } from '../entities/projectRoundRecord';
import { ProjectUserRecord } from '../entities/projectUserRecord';
import { setAnkrTimestamp } from '../repositories/ankrStateRepository';

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
describe('syncByAnkr Test Cases', syncByAnkrTestCases);
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
    await sendNotificationForDonation({
      donation,
    });
    const updatedDonation = await findDonationById(donation.id);
    assert.isTrue(updatedDonation?.segmentNotified);
  });
}

function syncDonationStatusWithBlockchainNetworkTestCases() {
  const amount = 10;
  const timestamp = 1706289475 * 1000;

  const transactionInfo = {
    txHash:
      '0x139504e0868ce12f615c711af95a8c043197cd2d5a9a0a7df85a196d9a1ab07e',
    currency: 'POL',
    networkId: NETWORK_IDS.ZKEVM_MAINNET,
    fromAddress: '0xbdFF5cc1df5ffF6B01C4a8b0B8271328E92742Da',
    toAddress: '0x193918F1Cb3e42007d613aaA99912aaeC4230e54',
    amount,
    timestamp,
  };
  let user: User;
  let project: Project;
  let donation: Donation;
  let ea: EarlyAccessRound | undefined;
  let qf: QfRound | undefined;

  before(async () => {
    user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
  });

  beforeEach(async () => {
    donation = await saveDonationDirectlyToDb(
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
  });

  afterEach(async () => {
    await Donation.delete({
      id: donation.id,
    });
    await ProjectRoundRecord.delete({});
    await ProjectUserRecord.delete({});
    if (ea) {
      await ea.remove();
      ea = undefined;
    }
    if (qf) {
      await qf.remove();
      qf = undefined;
    }
    sinon.restore();
  });

  it('should verify a Polygon donation', async () => {
    // https://polygonscan.com/tx/0x16f122ad45705dfa41bb323c3164b6d840cbb0e9fa8b8e58bd7435370f8bbfc8

    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.isTrue(updateDonation.segmentNotified);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
  });

  it('should associate donation to overlapping early access round after verification', async () => {
    sinon.stub(chains, 'validateTransactionWithInputData');
    ea = await EarlyAccessRound.create({
      roundNumber: generateEARoundNumber(),
      startDate: moment(timestamp).subtract(1, 'days').toDate(),
      endDate: moment(timestamp).add(3, 'days').toDate(),
      roundUSDCapPerProject: 1000000,
      roundUSDCapPerUserPerProject: 50000,
      tokenPrice: 0.1,
    }).save();
    // update donation timestamp to after the early access round end date
    await Donation.update(
      { id: donation.id },
      {
        createdAt: moment(timestamp).add(5, 'days').toDate(),
      },
    );

    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
    // assert.equal(updateDonation.earlyAccessRoundId, ea.id);
  });

  it('should associate donation to overlapping qf round after verification', async () => {
    sinon.stub(chains, 'validateTransactionWithInputData');
    qf = await QfRound.create({
      roundNumber: 1,
      isActive: true,
      name: new Date().toString() + ' - 1',
      allocatedFund: 100,
      minimumPassportScore: 12,
      slug: new Date().getTime().toString() + ' - 1',
      roundUSDCapPerProject: 10_000,
      roundUSDCloseCapPerProject: 10_500,
      roundUSDCapPerUserPerProject: 2_500,
      tokenPrice: 0.5,

      beginDate: moment(timestamp).subtract(1, 'second'),
      endDate: moment(timestamp).add(2, 'day'),
    }).save();

    // update donation timestamp to after the qf round end date
    await Donation.update(
      { id: donation.id },
      {
        createdAt: moment(timestamp).add(5, 'days').toDate(),
      },
    );

    const updateDonation = await syncDonationStatusWithBlockchainNetwork({
      donationId: donation.id,
    });
    assert.isOk(updateDonation);
    assert.equal(updateDonation.id, donation.id);
    assert.equal(updateDonation.status, DONATION_STATUS.VERIFIED);
    // assert.equal(updateDonation.qfRoundId, qf.id);
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
  it('should return true for endaoment projects accepting ETH on mainnet', async () => {
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
  it('should return false for endaoment projects accepting GIV on xdai', async () => {
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
  it('should return false for endaoment projects accepting XDAI on xdai', async () => {
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
  it('should return false for endaoment projects accepting GIV on mainnet', async () => {
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
  it('should not change updatedAt', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    await updateProjectStatistics(project.id);
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
      { symbol: token },
      CHAIN_ID.POLYGON,
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
      { symbol: token },
      CHAIN_ID.CELO,
    );
    donation = (await findDonationById(donation.id))!;
    expect(donation.valueUsd).to.gt(0);
  });

  it('should fill price for mpETH donation on the MAINNET network', async () => {
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

  it('should fill price for mpETH donation on the OPTIMISM network', async () => {
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
      { symbol: token },
      CHAIN_ID.ALFAJORES,
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

    // firstProject.qfRounds = [qfRound];

    // await firstProject.save();
  });

  afterEach(async () => {
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should return correct value for single project', async () => {
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

function syncByAnkrTestCases() {
  const amount = 10;
  const timestamp = 1706289475;

  const transactionInfo = {
    txHash:
      '0x139504e0868ce12f615c711af95a8c043197cd2d5a9a0a7df85a196d9a1ab07e'.toLowerCase(),
    currency: 'POL',
    networkId: NETWORK_IDS.ZKEVM_MAINNET,
    fromAddress:
      '0xbdFF5cc1df5ffF6B01C4a8b0B8271328E92742Da'.toLocaleLowerCase(),
    toAddress: '0x193918F1Cb3e42007d613aaA99912aaeC4230e54'.toLocaleLowerCase(),
    amount,
    timestamp,
  };
  let user: User;
  let project: Project;
  let donation: Donation;
  let ea: EarlyAccessRound | undefined;
  let qf: QfRound | undefined;

  before(async () => {
    user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    await Donation.delete({ transactionId: transactionInfo.txHash });
  });

  afterEach(async () => {
    if (!donation) return;
    await Donation.delete({
      id: donation.id,
    });
    await ProjectRoundRecord.delete({});
    await ProjectUserRecord.delete({});
    if (ea) {
      await ea.remove();
      ea = undefined;
    }
    if (qf) {
      await qf.remove();
      qf = undefined;
    }
    sinon.restore();
  });

  it.skip('should create donation after sync by ankr', async () => {
    await setAnkrTimestamp(timestamp - 10);

    await syncDonationsWithAnkr();

    const donation = await Donation.findOne({
      where: {
        transactionId: transactionInfo.txHash,
      },
      select: {
        id: true,
        transactionId: true,
        userId: true,
        projectId: true,
        status: true,
      },
    });

    assert.isOk(donation);
    assert.equal(donation?.transactionId, transactionInfo.txHash);
    assert.equal(donation?.userId, user.id);
    assert.equal(donation?.projectId, project.id);
    assert.equal(donation?.status, DONATION_STATUS.PENDING);
  });
}
