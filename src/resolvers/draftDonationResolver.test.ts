import { assert, expect } from 'chai';
import axios from 'axios';
import moment from 'moment';
import sinon from 'sinon';
import {
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  createProjectData,
  createDonationData,
  generateRandomEvmTxHash,
  generateRandomStellarTxHash,
  generateRandomEtheriumAddress,
  saveRecurringDonationDirectlyToDb,
  generateRandomStellarAddress,
  saveDonationDirectlyToDb,
  saveUserDirectlyToDb,
  stubStellarHorizonPayments as stubHorizonPayments,
  horizonPaymentRecord,
} from '../../test/testUtils';
import {
  createDraftDonationMutation,
  createDraftRecurringDonationMutation,
  getDraftDonationByIdQuery,
  markDraftDonationAsFailedDateMutation,
  renewDraftDonationExpirationDateMutation,
  createDonationMutation,
} from '../../test/graphqlQueries';
import { NETWORK_IDS } from '../provider';
import { User } from '../entities/user';
import { generateRandomString } from '../utils/utils';
import { ChainType } from '../types/network';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';
import { Donation } from '../entities/donation';
import {
  DRAFT_RECURRING_DONATION_STATUS,
  DraftRecurringDonation,
} from '../entities/draftRecurringDonation';
import { ProjectAddress } from '../entities/projectAddress';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { QfRound } from '../entities/qfRound';
import { ProjectQfRound } from '../entities/projectQfRound';
import { DONATION_STATUS } from '../entities/donation';
import { Token } from '../entities/token';
import {
  checkTransactions,
  processPendingQRDraftDonations,
  QR_CRON_RUN_LOCK_KEY,
} from '../services/cronJobs/checkQRTransactionJob';
import * as donationService from '../services/donationService';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';
import { redis } from '../redis';

describe('createDraftDonation() test cases', createDraftDonationTestCases);
describe(
  'createDraftRecurringDonation() test cases',
  createDraftRecurringDonationTestCases,
);
describe(
  'createQRCodeDraftDonation() test cases',
  createQRCodeDraftDonationTestCases,
);
describe(
  'renewDraftDonationExpirationDate() test cases',
  renewDraftDonationExpirationDateTestCases,
);
describe(
  'markDraftDonationAsFailed() test cases',
  markDraftDonationAsFailedTestCases,
);
describe(
  'stellar QR draft donation race condition test cases',
  stellarQRDraftRaceConditionTestCases,
);
describe(
  'stellar QR donation matching test cases (memo-identified vs recipient-memo)',
  stellarQRMatchingTestCases,
);

function createDraftDonationTestCases() {
  let project;
  let referrerId;
  let user;
  let tokenAddress;
  let accessToken;
  let safeTransactionId;
  let donationData;

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());
    referrerId = generateRandomString();

    user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    tokenAddress = generateRandomEtheriumAddress();
    accessToken = await generateTestAccessToken(user.id);
    safeTransactionId = generateRandomEvmTxHash();
    donationData = {
      projectId: project.id,
      networkId: NETWORK_IDS.XDAI,
      amount: 10,
      token: 'GIV',
      referrerId,
      tokenAddress,
      safeTransactionId,
      toAddress: project.walletAddress,
    };
  });
  it('should throw an error while creating draft donate to an invalid Project ID', async () => {
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: { ...donationData, projectId: 1000000 },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND),
    );
  });
  it('should throw an error while creating draft donating to his/her own project', async () => {
    const copyProjectSecondUser = await saveProjectDirectlyToDb(
      createProjectData(),
      user,
    );
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: { ...donationData, projectId: copyProjectSecondUser.id },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      "Donor can't create a draft to donate to his/her own project.",
    );
  });
  it('create simple draft donation', async () => {
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftDonation);
    const draftDonation = await DraftDonation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDraftDonation,
      },
    });

    expect(draftDonation).deep.contain({
      networkId: NETWORK_IDS.XDAI,
      chainType: ChainType.EVM,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: project.walletAddress!,
      fromWalletAddress: user.walletAddress!,
      tokenAddress,
      currency: 'GIV',
      anonymous: false,
      amount: 10,
      referrerId,
      projectId: project.id,
      userId: user.id,
    });
  });

  it('should return the same draft donation id if the same donation is created twice', async () => {
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftDonation);

    const saveDonationResponse2 = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse2.data.data.createDraftDonation);
    expect(saveDonationResponse2.data.data.createDraftDonation).to.be.equal(
      saveDonationResponse.data.data.createDraftDonation,
    );
  });

  it('should create a new draft donation if the first one is matched', async () => {
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftDonation);

    const draftDonation = await DraftDonation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDraftDonation,
      },
    });

    draftDonation!.status = DRAFT_DONATION_STATUS.MATCHED;
    await draftDonation!.save();

    const saveDonationResponse2 = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse2.data.data.createDraftDonation);
    expect(saveDonationResponse2.data.data.createDraftDonation).to.be.not.equal(
      saveDonationResponse.data.data.createDraftDonation,
    );
  });

  it('should create draft donation with roundId parameter', async () => {
    // First create a QF round
    const qfRound = await QfRound.create({
      isActive: true,
      name: 'Test QF Round for Draft Donation',
      minimumPassportScore: 8,
      slug: 'test-qf-round-draft',
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();

    // Add project to QF round using ProjectQfRound entity
    await ProjectQfRound.create({
      projectId: project.id,
      qfRoundId: qfRound.id,
    }).save();

    const draftDonationData = {
      ...donationData,
      roundId: qfRound.id,
    };

    const saveDraftDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: draftDonationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(saveDraftDonationResponse.data.data.createDraftDonation);

    // Verify the draft donation was created with the correct QF round
    const draftDonation = await DraftDonation.findOne({
      where: {
        id: saveDraftDonationResponse.data.data.createDraftDonation,
      },
      relations: ['qfRound'],
    });

    assert.isNotNull(draftDonation);
    assert.equal(draftDonation?.qfRoundId, qfRound.id);
    assert.equal(draftDonation?.qfRound?.id, qfRound.id);

    // Clean up
    qfRound.isActive = false;
    await qfRound.save();
  });

  it('should create donation from draft donation with QF round ID', async () => {
    // First create a QF round
    const qfRound = await QfRound.create({
      isActive: true,
      name: 'Test QF Round for Draft to Donation',
      minimumPassportScore: 8,
      slug: 'test-qf-round-draft-to-donation',
      allocatedFund: 100,
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();

    // Add project to QF round using ProjectQfRound entity
    await ProjectQfRound.create({
      projectId: project.id,
      qfRoundId: qfRound.id,
    }).save();

    // Create a draft donation with QF round ID
    const draftDonationData = {
      ...donationData,
      roundId: qfRound.id,
      fromTokenAmount: 10, // Set fromTokenAmount to match the amount
    };

    const saveDraftDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: draftDonationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(saveDraftDonationResponse.data.data.createDraftDonation);
    const draftDonationId =
      saveDraftDonationResponse.data.data.createDraftDonation;

    // Verify the draft donation was created with the correct QF round
    const draftDonation = await DraftDonation.findOne({
      where: { id: draftDonationId },
    });

    assert.isNotNull(draftDonation);
    assert.equal(draftDonation?.qfRoundId, qfRound.id);

    // Now create a donation using the GraphQL mutation with the QF round ID
    const createDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          amount: draftDonation!.amount,
          transactionId: generateRandomEvmTxHash(),
          transactionNetworkId: draftDonation!.networkId,
          tokenAddress: draftDonation!.tokenAddress,
          anonymous: draftDonation!.anonymous,
          token: draftDonation!.currency,
          projectId: draftDonation!.projectId,
          nonce: 1,
          transakId: '',
          referrerId: draftDonation!.referrerId,
          fromTokenAmount: draftDonation!.fromTokenAmount,
          roundId: draftDonation!.qfRoundId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(createDonationResponse.data.data.createDonation);

    // Check if a donation was created
    const createdDonation = await Donation.findOne({
      where: {
        projectId: project.id,
        userId: user.id,
      },
      order: { createdAt: 'DESC' },
    });

    assert.isNotNull(createdDonation);
    assert.equal(createdDonation?.qfRoundId, qfRound.id);
    assert.equal(createdDonation?.amount, donationData.amount);
    assert.equal(createdDonation?.currency, donationData.token);

    // Clean up - delete all created data
    if (createdDonation) {
      await Donation.remove(createdDonation);
    }

    if (draftDonation) {
      await DraftDonation.remove(draftDonation);
    }

    // Remove project from QF round
    await ProjectQfRound.delete({
      projectId: project.id,
      qfRoundId: qfRound.id,
    });

    // Delete the QF round
    await QfRound.remove(qfRound);
  });
}

function createQRCodeDraftDonationTestCases() {
  let project;
  let user;
  let accessToken;
  let donationData;
  let stellarAddress;

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());

    stellarAddress = ProjectAddress.create({
      project,
      title: 'stellar address',
      address: generateRandomStellarAddress(),
      chainType: ChainType.STELLAR,
      networkId: 0,
      isRecipient: true,
    });
    await stellarAddress.save();

    user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    accessToken = await generateTestAccessToken(user.id);

    donationData = {
      projectId: project.id,
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      amount: 10,
      token: 'XLM',
      toAddress: stellarAddress.address,
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
    };
  });

  it('create simple draft donation (user authenticated)', async () => {
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftDonation);
    const draftDonation = await DraftDonation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDraftDonation,
      },
    });
    expect(draftDonation).deep.contain({
      userId: user.id,
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      chainType: ChainType.STELLAR,
      status: DRAFT_DONATION_STATUS.PENDING,
      fromWalletAddress: '',
      toWalletAddress: stellarAddress.address,
      currency: 'XLM',
      anonymous: false,
      amount: 10,
      projectId: project.id,
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
      matchedDonationId: null,
    });
  });

  it('create simple draft donation (user not authenticated)', async () => {
    const saveDonationResponse = await axios.post(graphqlUrl, {
      query: createDraftDonationMutation,
      variables: donationData,
    });
    assert.isOk(saveDonationResponse.data.data.createDraftDonation);
    const draftDonation = await DraftDonation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDraftDonation,
      },
    });

    expect(draftDonation).deep.contain({
      userId: null,
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      chainType: ChainType.STELLAR,
      status: DRAFT_DONATION_STATUS.PENDING,
      fromWalletAddress: '',
      toWalletAddress: stellarAddress.address,
      currency: 'XLM',
      anonymous: false,
      amount: 10,
      projectId: project.id,
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
      matchedDonationId: null,
    });
  });

  it('should throw an error if QR code data is not provided', async () => {
    try {
      await axios.post(graphqlUrl, {
        query: createDraftDonationMutation,
        variables: {
          ...donationData,
          qrCodeDataUrl: undefined,
        },
      });
    } catch (error) {
      expect(error.response.data.errors[0].message).to.be.equal(
        'QR code data URL is required',
      );
    }
  });

  it('should throw an error if QR code data is not a valid URL', async () => {
    try {
      await axios.post(graphqlUrl, {
        query: createDraftDonationMutation,
        variables: {
          ...donationData,
          qrCodeDataUrl: 'invalid-url',
        },
      });
    } catch (error) {
      expect(error.response.data.errors[0].message).to.be.equal(
        'QR code data URL is not a valid URL',
      );
    }
  });
}

function createDraftRecurringDonationTestCases() {
  let project;
  let user;
  let accessToken;
  let donationData;

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());

    user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();

    accessToken = await generateTestAccessToken(user.id);
    donationData = {
      projectId: project.id,
      networkId: NETWORK_IDS.XDAI,
      flowRate: '100',
      currency: 'GIV',
      toAddress: project.walletAddress,
    };
  });

  it('create simple draft recurring donation', async () => {
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftRecurringDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftRecurringDonation);
    const draftRecurringDonation = await DraftRecurringDonation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDraftRecurringDonation,
      },
    });

    expect(draftRecurringDonation).deep.contain({
      networkId: donationData.networkId,
      chainType: ChainType.EVM,
      status: DRAFT_RECURRING_DONATION_STATUS.PENDING,
      currency: 'GIV',
      anonymous: false,
      isBatch: false,
      flowRate: donationData.flowRate,
      projectId: project.id,
      donorId: user.id,
    });
  });
  it('create simple draft donation when isForUpdate:true but recurringDonation doesnt exist', async () => {
    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: user.id,
        projectId: project.id,
        networkId: NETWORK_IDS.XDAI,
        currency: 'GIV',
      },
    });
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftRecurringDonationMutation,
        variables: {
          ...donationData,
          isForUpdate: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftRecurringDonation);
    const draftRecurringDonation = await DraftRecurringDonation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDraftRecurringDonation,
      },
    });

    expect(draftRecurringDonation).deep.contain({
      networkId: donationData.networkId,
      chainType: ChainType.EVM,
      status: DRAFT_RECURRING_DONATION_STATUS.PENDING,
      currency: 'GIV',
      anonymous: false,
      isBatch: false,
      flowRate: donationData.flowRate,
      projectId: project.id,
      donorId: user.id,
    });
  });

  it.skip('should return the same draft recurring donation id if the same donation is created twice', async () => {
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftRecurringDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftRecurringDonation);

    const saveDonationResponse2 = await axios.post(
      graphqlUrl,
      {
        query: createDraftRecurringDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse2.data.data.createDraftRecurringDonation);
    expect(
      saveDonationResponse2.data.data.createDraftRecurringDonation,
    ).to.be.equal(saveDonationResponse.data.data.createDraftRecurringDonation);
  });

  it('should create a new draft recurring donation if the first one is matched', async () => {
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftRecurringDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDraftRecurringDonation);

    const draftDonation = await DraftRecurringDonation.findOne({
      where: {
        id: saveDonationResponse.data.data.createDraftRecurringDonation,
      },
    });

    draftDonation!.status = DRAFT_RECURRING_DONATION_STATUS.MATCHED;
    await draftDonation!.save();

    const saveDonationResponse2 = await axios.post(
      graphqlUrl,
      {
        query: createDraftRecurringDonationMutation,
        variables: donationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse2.data.data.createDraftRecurringDonation);
    expect(
      saveDonationResponse2.data.data.createDraftRecurringDonation,
    ).to.be.not.equal(
      saveDonationResponse.data.data.createDraftRecurringDonation,
    );
  });
}

function renewDraftDonationExpirationDateTestCases() {
  it.skip('should renew the expiration date of the draft donation', async () => {
    //TODO Meriem should fix it later
    const project = await saveProjectDirectlyToDb(createProjectData());

    const donationData = {
      projectId: project.id,
      transactionId: generateRandomStellarTxHash(),
      transactionNetworkId: NETWORK_IDS.STELLAR_MAINNET,
      amount: 10,
      currency: 'XLM',
      anonymous: false,
      fromWalletAddress: generateRandomStellarAddress(),
      toWalletAddress: generateRandomStellarAddress(),
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
      expiresAt: new Date(),
      createdAt: new Date(),
    };

    const saveDonationResponse = await saveDonationDirectlyToDb(donationData);
    const draftDonationId = saveDonationResponse.id;

    const draftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonationId,
      },
    });
    const expirationDate = draftDonation!.expiresAt;

    const {
      data: {
        data: { renewDraftDonationExpirationDate },
      },
    } = await axios.post(graphqlUrl, {
      query: renewDraftDonationExpirationDateMutation,
      variables: {
        id: draftDonationId,
      },
    });

    const renewedExpirationDate = new Date(
      renewDraftDonationExpirationDate!.expiresAt,
    ).getTime();
    const originalExpirationDate = new Date(expirationDate!).getTime();

    expect(draftDonation).to.be.not.null;
    expect(expirationDate).to.be.not.null;
    expect(renewedExpirationDate).to.be.not.null;
    expect(renewedExpirationDate).to.be.greaterThan(originalExpirationDate);
  });

  async function createQrDraftForRenewal(
    overrides: Partial<DraftDonation> = {},
  ): Promise<DraftDonation> {
    const project = await saveProjectDirectlyToDb(createProjectData());
    return DraftDonation.create({
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      chainType: ChainType.STELLAR,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: generateRandomStellarAddress(),
      fromWalletAddress: '',
      currency: 'XLM',
      anonymous: false,
      amount: 10,
      projectId: project.id,
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      ...overrides,
    }).save();
  }

  it('should renew a failed draft donation that has no matchedDonationId', async () => {
    const draft = await createQrDraftForRenewal({
      status: DRAFT_DONATION_STATUS.FAILED,
    });
    const originalExpiresAt = new Date(draft.expiresAt!).getTime();

    const response = await axios.post(graphqlUrl, {
      query: renewDraftDonationExpirationDateMutation,
      variables: { id: draft.id },
    });

    const renewedExpiresAt = new Date(
      response.data.data.renewDraftDonationExpirationDate.expiresAt,
    ).getTime();
    expect(renewedExpiresAt).to.be.greaterThan(originalExpiresAt);

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
  });

  it('should not renew a draft donation that references a live donation', async () => {
    const draft = await createQrDraftForRenewal({
      status: DRAFT_DONATION_STATUS.FAILED,
    });
    const donation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      undefined,
      draft.projectId,
    );
    await DraftDonation.update(
      { id: draft.id },
      { matchedDonationId: donation.id },
    );
    const originalExpiresAt = new Date(draft.expiresAt!).getTime();

    const response = await axios.post(graphqlUrl, {
      query: renewDraftDonationExpirationDateMutation,
      variables: { id: draft.id },
    });

    expect(response.data.data?.renewDraftDonationExpirationDate ?? null).to.be
      .null;

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
    expect(fresh!.matchedDonationId).to.equal(donation.id);
    expect(new Date(fresh!.expiresAt!).getTime()).to.equal(originalExpiresAt);
  });

  it('should renew a draft donation whose referenced donation failed, so the donor can retry', async () => {
    const draft = await createQrDraftForRenewal({
      status: DRAFT_DONATION_STATUS.FAILED,
    });
    const donation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.FAILED }),
      undefined,
      draft.projectId,
    );
    await DraftDonation.update(
      { id: draft.id },
      { matchedDonationId: donation.id },
    );
    const originalExpiresAt = new Date(draft.expiresAt!).getTime();

    const response = await axios.post(graphqlUrl, {
      query: renewDraftDonationExpirationDateMutation,
      variables: { id: draft.id },
    });

    const renewedExpiresAt = new Date(
      response.data.data.renewDraftDonationExpirationDate.expiresAt,
    ).getTime();
    expect(renewedExpiresAt).to.be.greaterThan(originalExpiresAt);

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
  });

  it('should not renew a matched draft donation', async () => {
    const draft = await createQrDraftForRenewal({
      status: DRAFT_DONATION_STATUS.MATCHED,
      matchedDonationId: 424243,
    });

    const response = await axios.post(graphqlUrl, {
      query: renewDraftDonationExpirationDateMutation,
      variables: { id: draft.id },
    });

    expect(response.data.data?.renewDraftDonationExpirationDate ?? null).to.be
      .null;

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
  });
}

function markDraftDonationAsFailedTestCases() {
  it('should only mark the draft donation with (isQRDonation == true) as failed', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    const draftDonationData = {
      projectId: project.id,
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      amount: 10,
      token: 'XLM',
      toAddress: generateRandomStellarAddress(),
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
    };

    const draftDonationResponse = await axios.post(graphqlUrl, {
      query: createDraftDonationMutation,
      variables: draftDonationData,
    });
    const draftDonationId = draftDonationResponse.data.data.createDraftDonation;

    expect(draftDonationId).to.be.not.null;

    const draftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonationId,
      },
    });

    expect(draftDonation).to.be.not.null;
    expect(draftDonation!.status).to.be.equal(DRAFT_DONATION_STATUS.PENDING);

    const {
      data: {
        data: { markDraftDonationAsFailed },
      },
    } = await axios.post(graphqlUrl, {
      query: markDraftDonationAsFailedDateMutation,
      variables: {
        id: draftDonationId,
      },
    });

    const updatedDraftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonationId,
      },
    });

    expect(markDraftDonationAsFailed).to.be.true;
    expect(updatedDraftDonation).to.be.not.null;
    expect(updatedDraftDonation!.status).to.be.equal(
      DRAFT_DONATION_STATUS.FAILED,
    );
  });

  it('should not mark the draft donation with (isQRDonation == false) as failed', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const draftDonationData = {
      projectId: project.id,
      networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
      amount: 10,
      token: 'ETH',
      toAddress: generateRandomEtheriumAddress(),
    };

    const draftDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDraftDonationMutation,
        variables: draftDonationData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const draftDonationId = draftDonationResponse.data.data.createDraftDonation;

    expect(draftDonationId).to.be.not.null;

    const draftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonationId,
      },
    });

    expect(draftDonation).to.be.not.null;
    expect(draftDonation!.status).to.be.equal(DRAFT_DONATION_STATUS.PENDING);

    const {
      data: {
        data: { markDraftDonationAsFailed },
      },
    } = await axios.post(graphqlUrl, {
      query: markDraftDonationAsFailedDateMutation,
      variables: {
        id: draftDonationId,
      },
    });

    const updatedDraftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonationId,
      },
    });

    expect(markDraftDonationAsFailed).to.be.false;
    expect(updatedDraftDonation).to.be.not.null;
    expect(updatedDraftDonation!.status).to.be.equal(
      DRAFT_DONATION_STATUS.PENDING,
    );
  });

  it('should not mark the draft donation as failed if it is already matched', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());

    const draftDonationData = {
      projectId: project.id,
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      amount: 10,
      token: 'XLM',
      toAddress: generateRandomStellarAddress(),
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
    };

    const draftDonationResponse = await axios.post(graphqlUrl, {
      query: createDraftDonationMutation,
      variables: draftDonationData,
    });
    const draftDonationId = draftDonationResponse.data.data.createDraftDonation;

    expect(draftDonationId).to.be.not.null;

    const draftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonationId,
      },
    });

    expect(draftDonation).to.be.not.null;
    expect(draftDonation!.status).to.be.equal(DRAFT_DONATION_STATUS.PENDING);

    draftDonation!.status = DRAFT_DONATION_STATUS.MATCHED;
    await draftDonation!.save();

    const {
      data: {
        data: { markDraftDonationAsFailed },
      },
    } = await axios.post(graphqlUrl, {
      query: markDraftDonationAsFailedDateMutation,
      variables: {
        id: draftDonationId,
      },
    });

    const updatedDraftDonation = await DraftDonation.findOne({
      where: {
        id: draftDonationId,
      },
    });

    expect(markDraftDonationAsFailed).to.be.false;
    expect(updatedDraftDonation).to.be.not.null;
    expect(updatedDraftDonation!.status).to.be.equal(
      DRAFT_DONATION_STATUS.MATCHED,
    );
  });

  it('should not mark a draft donation as failed if it references a live donation, and repair it to matched', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const donation = await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      undefined,
      project.id,
    );

    const draftDonation = await DraftDonation.create({
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      chainType: ChainType.STELLAR,
      status: DRAFT_DONATION_STATUS.PENDING,
      toWalletAddress: generateRandomStellarAddress(),
      fromWalletAddress: '',
      currency: 'XLM',
      anonymous: false,
      amount: 10,
      projectId: project.id,
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      matchedDonationId: donation.id,
    }).save();

    const {
      data: {
        data: { markDraftDonationAsFailed },
      },
    } = await axios.post(graphqlUrl, {
      query: markDraftDonationAsFailedDateMutation,
      variables: {
        id: draftDonation.id,
      },
    });

    const updatedDraftDonation = await DraftDonation.findOne({
      where: { id: draftDonation.id },
    });

    expect(markDraftDonationAsFailed).to.be.false;
    expect(updatedDraftDonation!.status).to.be.equal(
      DRAFT_DONATION_STATUS.MATCHED,
    );
    expect(updatedDraftDonation!.matchedDonationId).to.be.equal(donation.id);
  });
}

// ---- Shared Stellar QR test fixtures, used by the race-condition and the
// ---- matching suites below (keep one copy; the suites only differ in the
// ---- draft defaults they layer on top).

const STELLAR_TEST_TOKEN_PRICE = 0.5;

// The QR matcher requires a Stellar XLM token flagged with isQR
async function ensureStellarQrXlmToken() {
  const existingToken = await Token.findOne({
    where: { symbol: 'XLM', networkId: NETWORK_IDS.STELLAR_MAINNET },
  });
  if (!existingToken) {
    await Token.create({
      name: 'Stellar Lumens',
      symbol: 'XLM',
      address: 'native',
      networkId: NETWORK_IDS.STELLAR_MAINNET,
      decimals: 7,
      chainType: ChainType.STELLAR,
      isQR: true,
      coingeckoId: 'stellar',
    }).save();
  } else if (!existingToken.isQR) {
    existingToken.isQR = true;
    await existingToken.save();
  }
}

async function setupStellarQrSuiteState() {
  const project = await saveProjectDirectlyToDb(createProjectData());
  const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  sinon
    .stub(CoingeckoPriceAdapter.prototype, 'getTokenPrice')
    .resolves(STELLAR_TEST_TOKEN_PRICE);
  sinon
    .stub(donationService, 'syncDonationStatusWithBlockchainNetwork')
    .resolves({} as any);
  return { project, user };
}

async function createStellarDraftFor(
  project: { id: number },
  user: { id: number },
  overrides: Partial<DraftDonation> = {},
): Promise<DraftDonation> {
  return DraftDonation.create({
    networkId: NETWORK_IDS.STELLAR_MAINNET,
    chainType: ChainType.STELLAR,
    status: DRAFT_DONATION_STATUS.PENDING,
    toWalletAddress: generateRandomStellarAddress(),
    fromWalletAddress: '',
    currency: 'XLM',
    anonymous: false,
    amount: 10,
    projectId: project.id,
    userId: user.id,
    qrCodeDataUrl: 'data:image/png;base64,123',
    isQRDonation: true,
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    ...overrides,
  }).save();
}

// A Horizon payment-operation record for `draft`, delegating to the shared
// horizonPaymentRecord shape. The memo defaults to the draft's recipient
// memo when it has one (CASE 2) and to the draft id otherwise (CASE 1);
// tests probing memo behavior pass `memo` explicitly.
function stellarPayment(
  draft: DraftDonation,
  opts: {
    txHash?: string;
    createdAt?: Date;
    memo?: string;
    successful?: boolean;
    amount?: number;
    to?: string;
  } = {},
) {
  return horizonPaymentRecord({
    to: opts.to ?? draft.toWalletAddress,
    amount: opts.amount ?? draft.amount,
    txHash: opts.txHash,
    createdAt: opts.createdAt,
    successful: opts.successful,
    memo: opts.memo ?? draft.toWalletMemo ?? String(draft.id),
  });
}

function stellarQRDraftRaceConditionTestCases() {
  let project;
  let user;

  before(ensureStellarQrXlmToken);

  beforeEach(async () => {
    ({ project, user } = await setupStellarQrSuiteState());
  });

  afterEach(() => {
    sinon.restore();
  });

  // Race-condition drafts default to a recipient-required memo (CASE 2).
  const createStellarDraft = (overrides: Partial<DraftDonation> = {}) =>
    createStellarDraftFor(project, user, {
      toWalletMemo: '123321',
      ...overrides,
    });

  it('should mark a pending draft as failed after expiration', async () => {
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    stubHorizonPayments([]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
  });

  it('should not let a stale cron execution fail a draft matched meanwhile', async () => {
    const draft = await createStellarDraft();

    // A stale execution loaded the draft while it was still pending, with an
    // already-passed expiry date
    const staleCopy = await DraftDonation.findOne({ where: { id: draft.id } });
    staleCopy!.expiresAt = new Date(Date.now() - 10 * 60 * 1000);
    staleCopy!.createdAt = new Date(Date.now() - 30 * 60 * 1000);

    // Meanwhile a newer execution matches the draft
    const donation = await saveDonationDirectlyToDb(
      {
        transactionId: generateRandomStellarTxHash(),
        transactionNetworkId: NETWORK_IDS.STELLAR_MAINNET,
        toWalletAddress: draft.toWalletAddress,
        fromWalletAddress: generateRandomStellarAddress(),
        currency: 'XLM',
        anonymous: false,
        amount: draft.amount,
        createdAt: new Date(),
        status: DONATION_STATUS.VERIFIED,
        projectId: project.id,
      },
      undefined,
      project.id,
    );
    await DraftDonation.update(
      { id: draft.id },
      {
        status: DRAFT_DONATION_STATUS.MATCHED,
        matchedDonationId: donation.id,
        fromWalletAddress: donation.fromWalletAddress,
      },
    );

    // The stale execution now processes its outdated entity
    stubHorizonPayments([]);
    await checkTransactions(staleCopy!, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
    expect(fresh!.matchedDonationId).to.equal(donation.id);
  });

  it('should create only one donation when two matcher executions run concurrently', async () => {
    const draft = await createStellarDraft();
    const payment = stellarPayment(draft);
    stubHorizonPayments([payment]);

    const copy1 = await DraftDonation.findOne({ where: { id: draft.id } });
    const copy2 = await DraftDonation.findOne({ where: { id: draft.id } });

    await Promise.all([
      checkTransactions(copy1!, 'stellar-cron'),
      checkTransactions(copy2!, 'graphql-verify'),
    ]);

    const donations = await Donation.find({
      where: { transactionId: payment.transaction_hash.toLowerCase() },
    });
    expect(donations.length).to.equal(1);

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
    expect(fresh!.matchedDonationId).to.equal(donations[0].id);
    expect(fresh!.fromWalletAddress).to.equal(payment.source_account);
  });

  it('should reconcile the draft when a donation for the transaction already exists', async () => {
    const draft = await createStellarDraft();
    const txHash = generateRandomStellarTxHash();
    const existingDonation = await saveDonationDirectlyToDb(
      {
        transactionId: txHash.toLowerCase(),
        transactionNetworkId: NETWORK_IDS.STELLAR_MAINNET,
        toWalletAddress: draft.toWalletAddress,
        fromWalletAddress: generateRandomStellarAddress(),
        currency: 'XLM',
        anonymous: false,
        amount: draft.amount,
        createdAt: new Date(),
        status: DONATION_STATUS.VERIFIED,
        projectId: project.id,
      },
      undefined,
      project.id,
    );
    stubHorizonPayments([stellarPayment(draft, { txHash })]);

    await checkTransactions(draft, 'stellar-cron');

    const donations = await Donation.find({
      where: { transactionId: txHash.toLowerCase() },
    });
    expect(donations.length).to.equal(1);

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
    expect(fresh!.matchedDonationId).to.equal(existingDonation.id);
    expect(fresh!.fromWalletAddress).to.equal(
      existingDonation.fromWalletAddress,
    );
  });

  it('should match an expired draft when the payment happened within its validity window', async () => {
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    // Payment made before expiry, but the matcher only sees it now
    const payment = stellarPayment(draft, {
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
    });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
    expect(fresh!.matchedDonationId).to.be.not.null;
  });

  it('should not match a payment made after the validity window and fail the expired draft', async () => {
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    // Payment made after expiry (+ grace minute)
    const payment = stellarPayment(draft, { createdAt: new Date() });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const donations = await Donation.find({
      where: { transactionId: payment.transaction_hash.toLowerCase() },
    });
    expect(donations.length).to.equal(0);

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
    expect(fresh!.matchedDonationId).to.be.null;
  });

  it('should not match a payment with a wrong memo or wrong amount', async () => {
    const draft = await createStellarDraft();
    stubHorizonPayments([
      stellarPayment(draft, { memo: 'wrong-memo' }),
      stellarPayment(draft, { amount: draft.amount + 1 }),
    ]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
    expect(fresh!.matchedDonationId).to.be.null;

    const donationsCount = await Donation.count({
      where: { toWalletAddress: draft.toWalletAddress },
    });
    expect(donationsCount).to.equal(0);
  });

  it('getDraftDonationById should reconcile a wrongly-failed draft that has a verified donation', async () => {
    const draft = await createStellarDraft();
    const donation = await saveDonationDirectlyToDb(
      {
        transactionId: generateRandomStellarTxHash(),
        transactionNetworkId: NETWORK_IDS.STELLAR_MAINNET,
        toWalletAddress: draft.toWalletAddress,
        fromWalletAddress: generateRandomStellarAddress(),
        currency: 'XLM',
        anonymous: false,
        amount: draft.amount,
        createdAt: new Date(),
        status: DONATION_STATUS.VERIFIED,
        projectId: project.id,
      },
      undefined,
      project.id,
    );
    // Simulate the production bug: matched draft overwritten to failed while
    // keeping its matchedDonationId
    await DraftDonation.update(
      { id: draft.id },
      {
        status: DRAFT_DONATION_STATUS.FAILED,
        matchedDonationId: donation.id,
      },
    );

    const result = await axios.post(graphqlUrl, {
      query: getDraftDonationByIdQuery,
      variables: { id: draft.id },
    });

    expect(result.data.data.getDraftDonationById.status).to.equal(
      DRAFT_DONATION_STATUS.MATCHED,
    );

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
  });

  it('getDraftDonationById should not hide a genuinely failed donation', async () => {
    const draft = await createStellarDraft();
    const donation = await saveDonationDirectlyToDb(
      {
        transactionId: generateRandomStellarTxHash(),
        transactionNetworkId: NETWORK_IDS.STELLAR_MAINNET,
        toWalletAddress: draft.toWalletAddress,
        fromWalletAddress: generateRandomStellarAddress(),
        currency: 'XLM',
        anonymous: false,
        amount: draft.amount,
        createdAt: new Date(),
        status: DONATION_STATUS.FAILED,
        projectId: project.id,
      },
      undefined,
      project.id,
    );
    await DraftDonation.update(
      { id: draft.id },
      {
        status: DRAFT_DONATION_STATUS.FAILED,
        matchedDonationId: donation.id,
      },
    );

    const result = await axios.post(graphqlUrl, {
      query: getDraftDonationByIdQuery,
      variables: { id: draft.id },
    });

    expect(result.data.data.getDraftDonationById.status).to.equal(
      DRAFT_DONATION_STATUS.FAILED,
    );
  });

  it('should reconcile a recently failed draft when its payment shows up on Horizon later', async () => {
    // Frontend timed the draft out (markDraftDonationAsFailed) while Horizon
    // had not indexed the payment yet.
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
      expiresAt: new Date(Date.now() - 5 * 60 * 1000),
      status: DRAFT_DONATION_STATUS.FAILED,
    });
    // The payment was made inside the draft's validity window.
    const payment = stellarPayment(draft, {
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    stubHorizonPayments([payment]);

    await processPendingQRDraftDonations();

    const donations = await Donation.find({
      where: { transactionId: payment.transaction_hash.toLowerCase() },
    });
    expect(donations.length).to.equal(1);

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
    expect(fresh!.matchedDonationId).to.equal(donations[0].id);

    // A second run must be idempotent: no duplicate donation.
    await processPendingQRDraftDonations();
    const donationsAfterRerun = await Donation.find({
      where: { transactionId: payment.transaction_hash.toLowerCase() },
    });
    expect(donationsAfterRerun.length).to.equal(1);
  });

  it('should not rescan a failed draft after the reconciliation window has passed', async () => {
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 90 * 60 * 1000),
      expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      status: DRAFT_DONATION_STATUS.FAILED,
    });
    // Even a payment inside the old validity window must not be picked up.
    const payment = stellarPayment(draft, {
      createdAt: new Date(Date.now() - 70 * 60 * 1000),
    });
    stubHorizonPayments([payment]);

    await processPendingQRDraftDonations();

    const donations = await Donation.find({
      where: { transactionId: payment.transaction_hash.toLowerCase() },
    });
    expect(donations.length).to.equal(0);

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
    expect(fresh!.matchedDonationId).to.be.null;
  });

  it('should keep a failed draft failed when no transaction appears during the reconciliation window', async () => {
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
      expiresAt: new Date(Date.now() - 5 * 60 * 1000),
      status: DRAFT_DONATION_STATUS.FAILED,
    });
    stubHorizonPayments([]);

    await processPendingQRDraftDonations();

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
    expect(fresh!.matchedDonationId).to.be.null;
  });

  it('should create only one donation when two different drafts inspect the same transaction concurrently', async () => {
    // Two donors, same project address, same project-level memo, same amount:
    // the payment satisfies both drafts' matching predicates.
    const draft1 = await createStellarDraft();
    const draft2 = await createStellarDraft({
      toWalletAddress: draft1.toWalletAddress,
    });
    const payment = stellarPayment(draft1);
    stubHorizonPayments([payment]);

    await Promise.all([
      checkTransactions(draft1, 'stellar-cron'),
      checkTransactions(draft2, 'graphql-verify'),
    ]);

    const donations = await Donation.find({
      where: { transactionId: payment.transaction_hash.toLowerCase() },
    });
    expect(donations.length).to.equal(1);

    const fresh1 = await DraftDonation.findOne({ where: { id: draft1.id } });
    const fresh2 = await DraftDonation.findOne({ where: { id: draft2.id } });
    const claimants = [fresh1, fresh2].filter(
      d => d!.matchedDonationId === donations[0].id,
    );
    expect(claimants.length).to.equal(1);
    const matched = [fresh1, fresh2].filter(
      d => d!.status === DRAFT_DONATION_STATUS.MATCHED,
    );
    expect(matched.length).to.equal(1);
    const untouched = [fresh1, fresh2].find(
      d => d!.matchedDonationId !== donations[0].id,
    );
    expect(untouched!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
    expect(untouched!.matchedDonationId).to.be.null;
  });

  it('should skip the cron run while another execution holds the run lease, then process normally', async () => {
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    stubHorizonPayments([]);

    await redis.set(QR_CRON_RUN_LOCK_KEY, 'another-runner', 'PX', 60 * 1000);
    try {
      await processPendingQRDraftDonations();
      const untouched = await DraftDonation.findOne({
        where: { id: draft.id },
      });
      expect(untouched!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
    } finally {
      await redis.del(QR_CRON_RUN_LOCK_KEY);
    }

    await processPendingQRDraftDonations();
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
  });

  it('should match a draft via its own older payment when a newer payment already belongs to another draft', async () => {
    // Same project address, same project-level memo, same amount: donor A's
    // newer payment appears first in Horizon's desc list, is already claimed
    // by draft A, and must not stop draft B's scan from reaching B's own
    // older payment.
    const draftA = await createStellarDraft();
    const draftB = await createStellarDraft({
      toWalletAddress: draftA.toWalletAddress,
    });

    const paymentA = stellarPayment(draftA, { createdAt: new Date() });
    const donationA = await saveDonationDirectlyToDb(
      {
        transactionId: paymentA.transaction_hash.toLowerCase(),
        transactionNetworkId: NETWORK_IDS.STELLAR_MAINNET,
        toWalletAddress: draftA.toWalletAddress,
        fromWalletAddress: paymentA.source_account,
        currency: 'XLM',
        anonymous: false,
        amount: draftA.amount,
        createdAt: new Date(),
        status: DONATION_STATUS.VERIFIED,
        projectId: project.id,
      },
      undefined,
      project.id,
    );
    await DraftDonation.update(
      { id: draftA.id },
      {
        status: DRAFT_DONATION_STATUS.MATCHED,
        matchedDonationId: donationA.id,
      },
    );

    const paymentB = stellarPayment(draftB, {
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
    });
    stubHorizonPayments([paymentA, paymentB]);

    await checkTransactions(draftB, 'stellar-cron');

    const donationB = await Donation.findOne({
      where: { transactionId: paymentB.transaction_hash.toLowerCase() },
    });
    expect(donationB).to.not.be.null;

    const freshB = await DraftDonation.findOne({ where: { id: draftB.id } });
    expect(freshB!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
    expect(freshB!.matchedDonationId).to.equal(donationB!.id);

    // Draft A keeps its own donation
    const freshA = await DraftDonation.findOne({ where: { id: draftA.id } });
    expect(freshA!.matchedDonationId).to.equal(donationA.id);
  });

  it('should fail an expired draft whose only candidate payment belongs to another draft', async () => {
    const draftA = await createStellarDraft();
    const draftB = await createStellarDraft({
      toWalletAddress: draftA.toWalletAddress,
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
    });

    // A payment inside draft B's window, but already claimed by draft A: it
    // must neither match draft B nor leave it pending forever.
    const paymentA = stellarPayment(draftA, {
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
    });
    const donationA = await saveDonationDirectlyToDb(
      {
        transactionId: paymentA.transaction_hash.toLowerCase(),
        transactionNetworkId: NETWORK_IDS.STELLAR_MAINNET,
        toWalletAddress: draftA.toWalletAddress,
        fromWalletAddress: paymentA.source_account,
        currency: 'XLM',
        anonymous: false,
        amount: draftA.amount,
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
        status: DONATION_STATUS.VERIFIED,
        projectId: project.id,
      },
      undefined,
      project.id,
    );
    await DraftDonation.update(
      { id: draftA.id },
      {
        status: DRAFT_DONATION_STATUS.MATCHED,
        matchedDonationId: donationA.id,
      },
    );
    stubHorizonPayments([paymentA]);

    await checkTransactions(draftB, 'stellar-cron');

    const freshB = await DraftDonation.findOne({ where: { id: draftB.id } });
    expect(freshB!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
    expect(freshB!.matchedDonationId).to.be.null;

    // No second donation was created for the claimed payment
    const donations = await Donation.find({
      where: { transactionId: paymentA.transaction_hash.toLowerCase() },
    });
    expect(donations.length).to.equal(1);
  });
}

function stellarQRMatchingTestCases() {
  let project;
  let user;

  before(ensureStellarQrXlmToken);

  beforeEach(async () => {
    ({ project, user } = await setupStellarQrSuiteState());
  });

  afterEach(() => {
    sinon.restore();
  });

  // Matching-suite drafts default to CASE 1: no recipient-required memo, so
  // the Stellar memo carries the draft donation id.
  const createStellarDraft = (overrides: Partial<DraftDonation> = {}) =>
    createStellarDraftFor(project, user, { amount: 20, ...overrides });

  // A Horizon create_account operation record funding the draft's address.
  function stellarCreateAccount(
    draft: DraftDonation,
    opts: { amount?: number; memo?: string } = {},
  ) {
    return horizonPaymentRecord({
      type: 'create_account',
      to: draft.toWalletAddress,
      amount: opts.amount ?? draft.amount,
      memo: opts.memo ?? String(draft.id),
    });
  }

  async function findDonationByTxHash(txHash: string) {
    return Donation.findOne({ where: { transactionId: txHash.toLowerCase() } });
  }

  it('CASE 1: should match a payment with the exact draft amount', async () => {
    const draft = await createStellarDraft();
    const payment = stellarPayment(draft);
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);

    const created = await findDonationByTxHash(payment.transaction_hash);
    expect(created).to.exist;
    expect(created!.amount).to.equal(20);
    expect(fresh!.matchedDonationId).to.equal(created!.id);
  });

  it('CASE 1: should match a payment whose amount was reduced by an exchange withdrawal fee and store the actual on-chain amount', async () => {
    // Draft asks for 20 XLM, Binance deducts its fee and broadcasts 19.996
    const draft = await createStellarDraft({ amount: 20 });
    const payment = stellarPayment(draft, { amount: 19.996 });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
    // The draft keeps the originally requested amount
    expect(Number(fresh!.amount)).to.equal(20);

    // The donation records what actually arrived on-chain, and derived
    // values are computed from that actual amount
    const created = await findDonationByTxHash(payment.transaction_hash);
    expect(created).to.exist;
    expect(created!.amount).to.be.closeTo(19.996, 1e-9);
    expect(created!.priceUsd).to.equal(STELLAR_TEST_TOKEN_PRICE);
    expect(created!.valueUsd).to.be.closeTo(
      19.996 * STELLAR_TEST_TOKEN_PRICE,
      1e-9,
    );
    expect(fresh!.matchedDonationId).to.equal(created!.id);
  });

  it('CASE 1: should not match a payment with the correct memo but a wrong destination', async () => {
    const draft = await createStellarDraft();
    const payment = stellarPayment(draft, {
      to: generateRandomStellarAddress(),
    });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
    expect(fresh!.matchedDonationId).to.be.null;
    expect(await findDonationByTxHash(payment.transaction_hash)).to.not.exist;
  });

  it('CASE 1: should not match a payment with a wrong draft-id memo', async () => {
    const draft = await createStellarDraft();
    const payment = stellarPayment(draft, { memo: String(draft.id + 1) });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
    expect(fresh!.matchedDonationId).to.be.null;
    expect(await findDonationByTxHash(payment.transaction_hash)).to.not.exist;
  });

  it('CASE 2: should keep matching on the exact amount when the recipient requires its own memo', async () => {
    const draft = await createStellarDraft({ toWalletMemo: '424242' });
    const payment = stellarPayment(draft, { memo: '424242' });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);

    const created = await findDonationByTxHash(payment.transaction_hash);
    expect(created).to.exist;
    expect(created!.amount).to.equal(20);
    expect(created!.toWalletMemo).to.equal('424242');
  });

  it('CASE 2: should not match a fee-reduced amount when the recipient requires its own memo', async () => {
    const draft = await createStellarDraft({
      toWalletMemo: '424242',
      amount: 20,
    });
    const payment = stellarPayment(draft, { memo: '424242', amount: 19.996 });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
    expect(fresh!.matchedDonationId).to.be.null;
    expect(await findDonationByTxHash(payment.transaction_hash)).to.not.exist;
  });

  it('CASE 1: should match a payment an exchange broadcast only after the draft expired (delayed withdrawal)', async () => {
    // Draft created 40 minutes ago and expired 24 minutes ago; the exchange
    // broadcast the withdrawal only 10 minutes ago — long after the old
    // 2-minute window and after the draft expiry, but within the
    // reconciliation window during which the draft is still scanned.
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 40 * 60 * 1000),
      expiresAt: new Date(Date.now() - 24 * 60 * 1000),
    });
    const payment = stellarPayment(draft, {
      amount: 19.996,
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);

    const created = await findDonationByTxHash(payment.transaction_hash);
    expect(created).to.exist;
    expect(created!.amount).to.be.closeTo(19.996, 1e-9);
  });

  it('CASE 2: should not match a payment broadcast after expiry when the recipient requires its own memo', async () => {
    const draft = await createStellarDraft({
      toWalletMemo: '424242',
      createdAt: new Date(Date.now() - 40 * 60 * 1000),
      expiresAt: new Date(Date.now() - 24 * 60 * 1000),
    });
    const payment = stellarPayment(draft, {
      memo: '424242',
      createdAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
    expect(fresh!.matchedDonationId).to.be.null;
    expect(await findDonationByTxHash(payment.transaction_hash)).to.not.exist;
  });

  it('CASE 1: should not create a duplicate donation when the same transaction is seen again on a later run', async () => {
    const draft = await createStellarDraft();
    const payment = stellarPayment(draft, { amount: 19.996 });
    stubHorizonPayments([payment]);

    await checkTransactions(draft, 'stellar-cron');

    // Next cron tick re-reads the draft and sees the same Horizon page
    const rescanned = await DraftDonation.findOne({ where: { id: draft.id } });
    await checkTransactions(rescanned!, 'stellar-cron');

    const donations = await Donation.find({
      where: { transactionId: payment.transaction_hash.toLowerCase() },
    });
    expect(donations.length).to.equal(1);

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);
    expect(fresh!.matchedDonationId).to.equal(donations[0].id);
  });

  it("CASE 1: should pick this draft's own payment out of several payments to the same address", async () => {
    const draft = await createStellarDraft();
    // A newer unrelated payment (wrong memo) and an older one that is ours
    const ownPayment = stellarPayment(draft, {
      amount: 19.996,
      createdAt: new Date(Date.now() - 3 * 60 * 1000),
    });
    stubHorizonPayments([
      stellarPayment(draft, { memo: 'unrelated', amount: 5 }),
      ownPayment,
    ]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);

    const created = await findDonationByTxHash(ownPayment.transaction_hash);
    expect(created).to.exist;
    expect(created!.amount).to.be.closeTo(19.996, 1e-9);
    expect(fresh!.matchedDonationId).to.equal(created!.id);
  });

  it('CASE 1: should credit the largest memo-carrying payment when a dust payment with the same memo is also on the page', async () => {
    const draft = await createStellarDraft({ amount: 20 });
    // A newer dust payment front-running the real one; both carry the
    // draft-id memo, so both identify the draft — the larger must win.
    const dust = stellarPayment(draft, { amount: 0.0000001 });
    const real = stellarPayment(draft, {
      amount: 19.996,
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
    });
    stubHorizonPayments([dust, real]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);

    const created = await findDonationByTxHash(real.transaction_hash);
    expect(created).to.exist;
    expect(created!.amount).to.be.closeTo(19.996, 1e-9);
    expect(fresh!.matchedDonationId).to.equal(created!.id);
    expect(await findDonationByTxHash(dust.transaction_hash)).to.not.exist;
  });

  it('CASE 1: should credit the largest operation when one transaction pays the address more than once', async () => {
    const draft = await createStellarDraft({ amount: 20 });
    // One Stellar transaction (one tx-level memo) carrying two payment
    // operations to the same address; the donation must record the larger.
    const txHash = generateRandomStellarTxHash();
    stubHorizonPayments([
      stellarPayment(draft, { amount: 0.1, txHash }),
      stellarPayment(draft, { amount: 19.9, txHash }),
    ]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);

    const created = await findDonationByTxHash(txHash);
    expect(created).to.exist;
    expect(created!.amount).to.be.closeTo(19.9, 1e-9);
  });

  it('CASE 1: should match a fee-reduced create_account funding that carries the draft-id memo', async () => {
    // First-ever payment to an unfunded address: the exchange broadcasts a
    // create_account op with the fee already deducted from starting_balance
    const draft = await createStellarDraft({ amount: 20 });
    const funding = stellarCreateAccount(draft, { amount: 19.996 });
    stubHorizonPayments([funding]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);

    const created = await findDonationByTxHash(funding.transaction_hash);
    expect(created).to.exist;
    expect(created!.amount).to.be.closeTo(19.996, 1e-9);
    expect(fresh!.matchedDonationId).to.equal(created!.id);
  });

  it('CASE 1: should not match a create_account with the exact draft amount but without the draft-id memo', async () => {
    const draft = await createStellarDraft({ amount: 20 });
    const funding = stellarCreateAccount(draft, {
      amount: 20,
      memo: 'unrelated',
    });
    stubHorizonPayments([funding]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
    expect(fresh!.matchedDonationId).to.be.null;
    expect(await findDonationByTxHash(funding.transaction_hash)).to.not.exist;
  });

  it('CASE 1: should credit the successful retry over a larger failed payment attempt', async () => {
    const draft = await createStellarDraft({ amount: 20 });
    // The donor's direct 20 XLM attempt failed on-chain; their exchange
    // retry landed 19.996 successfully. Both carry the draft-id memo.
    const failedAttempt = stellarPayment(draft, {
      amount: 20,
      successful: false,
    });
    const retry = stellarPayment(draft, {
      amount: 19.996,
      createdAt: new Date(Date.now() - 2 * 60 * 1000),
    });
    stubHorizonPayments([failedAttempt, retry]);

    await checkTransactions(draft, 'stellar-cron');

    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.MATCHED);

    const created = await findDonationByTxHash(retry.transaction_hash);
    expect(created).to.exist;
    expect(created!.amount).to.be.closeTo(19.996, 1e-9);
    expect(fresh!.matchedDonationId).to.equal(created!.id);
    expect(await findDonationByTxHash(failedAttempt.transaction_hash)).to.not
      .exist;
  });
}
