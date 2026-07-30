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
  QR_CRON_RUN_LOCK_ID,
  QR_DRAFT_DONATION_LOCK_NAMESPACE,
} from '../services/cronJobs/checkQRTransactionJob';
import * as donationService from '../services/donationService';
import { CoingeckoPriceAdapter } from '../adapters/price/CoingeckoPriceAdapter';
import { AppDataSource } from '../orm';

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

function stellarQRDraftRaceConditionTestCases() {
  let project;
  let user;

  before(async () => {
    // The QR matcher requires a Stellar XLM token flagged with isQR
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
  });

  beforeEach(async () => {
    project = await saveProjectDirectlyToDb(createProjectData());
    user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    sinon.stub(CoingeckoPriceAdapter.prototype, 'getTokenPrice').resolves(0.5);
    sinon
      .stub(donationService, 'syncDonationStatusWithBlockchainNetwork')
      .resolves({} as any);
  });

  afterEach(() => {
    sinon.restore();
  });

  async function createStellarDraft(
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
      toWalletMemo: '123321',
      qrCodeDataUrl: 'data:image/png;base64,123',
      isQRDonation: true,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ...overrides,
    }).save();
  }

  function stellarPayment(
    draft: DraftDonation,
    opts: {
      txHash?: string;
      createdAt?: Date;
      memo?: string;
      successful?: boolean;
      amount?: number;
    } = {},
  ) {
    return {
      type: 'payment',
      asset_type: 'native',
      to: draft.toWalletAddress,
      amount: String(opts.amount ?? draft.amount),
      source_account: generateRandomStellarAddress(),
      transaction_hash: opts.txHash ?? generateRandomStellarTxHash(),
      created_at: (opts.createdAt ?? new Date()).toISOString(),
      transaction_successful: opts.successful ?? true,
      transaction: { memo: opts.memo ?? draft.toWalletMemo },
    };
  }

  function stubHorizonPayments(records: any[]) {
    return sinon
      .stub(axios, 'get')
      .resolves({ data: { _embedded: { records } } });
  }

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

  it('should skip the cron run while another execution holds the lock, then process normally', async () => {
    const draft = await createStellarDraft({
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      expiresAt: new Date(Date.now() - 10 * 60 * 1000),
    });
    stubHorizonPayments([]);

    const queryRunner = AppDataSource.getDataSource().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.query('SELECT pg_advisory_lock($1, $2)', [
      QR_DRAFT_DONATION_LOCK_NAMESPACE,
      QR_CRON_RUN_LOCK_ID,
    ]);
    try {
      await processPendingQRDraftDonations();
      const untouched = await DraftDonation.findOne({
        where: { id: draft.id },
      });
      expect(untouched!.status).to.equal(DRAFT_DONATION_STATUS.PENDING);
    } finally {
      await queryRunner.query('SELECT pg_advisory_unlock($1, $2)', [
        QR_DRAFT_DONATION_LOCK_NAMESPACE,
        QR_CRON_RUN_LOCK_ID,
      ]);
      await queryRunner.release();
    }

    await processPendingQRDraftDonations();
    const fresh = await DraftDonation.findOne({ where: { id: draft.id } });
    expect(fresh!.status).to.equal(DRAFT_DONATION_STATUS.FAILED);
  });
}
