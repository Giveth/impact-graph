import { assert, expect } from 'chai';
import axios from 'axios';
import moment from 'moment';
import {
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEvmTxHash,
  generateRandomStellarTxHash,
  generateRandomEtheriumAddress,
  saveRecurringDonationDirectlyToDb,
  generateRandomStellarAddress,
  saveDonationDirectlyToDb,
} from '../../test/testUtils';
import {
  createDraftDonationMutation,
  createDraftRecurringDonationMutation,
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

    // Clean up
    qfRound.isActive = false;
    await qfRound.save();
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
}
