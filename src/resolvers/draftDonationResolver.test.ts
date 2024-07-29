import { assert, expect } from 'chai';
import axios from 'axios';
import {
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEvmTxHash,
  generateRandomEtheriumAddress,
  saveRecurringDonationDirectlyToDb,
} from '../../test/testUtils.js';
import {
  createDraftDonationMutation,
  createDraftRecurringDonationMutation,
} from '../../test/graphqlQueries.js';
import { NETWORK_IDS } from '../provider.js';
import { User } from '../entities/user.js';
import { generateRandomString } from '../utils/utils.js';
import { ChainType } from '../types/network.js';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation.js';
import {
  DRAFT_RECURRING_DONATION_STATUS,
  DraftRecurringDonation,
} from '../entities/draftRecurringDonation.js';

describe('createDraftDonation() test cases', createDraftDonationTestCases);
describe(
  'createDraftRecurringDonation() test cases',
  createDraftRecurringDonationTestCases,
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
