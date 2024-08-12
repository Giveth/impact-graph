import { assert, expect } from 'chai';
import axios from 'axios';
import {
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomEvmTxHash,
  generateRandomEtheriumAddress,
} from '../../test/testUtils';
import { createDraftDonationMutation } from '../../test/graphqlQueries';
import { NETWORK_IDS } from '../provider';
import { User } from '../entities/user';
import { generateRandomString } from '../utils/utils';
import { ChainType } from '../types/network';
import {
  DRAFT_DONATION_STATUS,
  DraftDonation,
} from '../entities/draftDonation';

describe('createDraftDonation() test cases', createDraftDonationTestCases);

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
