import { assert } from 'chai';
import {
  generateTestAccessToken,
  graphqlUrl,
  SEED_DATA,
  DONATION_SEED_DATA,
  saveProjectDirectlyToDb,
  createProjectData,
  generateRandomTxHash,
  generateRandomEtheriumAddress,
  saveDonationDirectlyToDb,
  createDonationData,
} from '../../test/testUtils';
import axios from 'axios';
import { errorMessages } from '../utils/errorMessages';
import { Donation } from '../entities/donation';
import {
  fetchDonationsByUserIdQuery,
  fetchDonationsByDonorQuery,
  saveDonation,
  fetchDonationsByProjectIdQuery,
  fetchAllDonationsQuery,
  donationsFromWallets,
} from '../../test/graphqlQueries';
import { NETWORK_IDS } from '../provider';
import { User } from '../entities/user';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { ProjStatus } from '../entities/project';
import { IsUppercase } from 'class-validator';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

// TODO Write test cases
describe('donations() test cases', donationsTestCases);
// describe('donationsFromWallets() test cases', donationsFromWalletsTestCases);
// describe('donationsToWallets() test cases', donationsToWalletsTestCases);
describe('donationsByProjectId() test cases', donationsByProjectIdTestCases);
describe('donationByUserId() test cases', donationsByUserIdTestCases);
// describe('tokens() test cases', tokensTestCases);
describe('donationsByDonor() test cases', donationsByDonorTestCases);
describe('saveDonation() test cases', saveDonationTestCases);
describe('donationsFromWallets() test cases', donationsFromWalletsTestCases);

// TODO I think we can delete  addUserVerification query
// describe('addUserVerification() test cases', addUserVerificationTestCases);

function donationsTestCases() {
  it('should throw error if send invalid fromDate format', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        fromDate: '20221203 10:12:30 and status=verified',
      },
    });

    assert.equal(
      donationsResponse.data.errors[0].message,
      errorMessages.INVALID_DATE_FORMAT,
    );
  });
  it('should throw error if send invalid toDate format', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        toDate: 'invalid date format',
      },
    });

    assert.equal(
      donationsResponse.data.errors[0].message,
      errorMessages.INVALID_DATE_FORMAT,
    );
  });
  it('should get result without sending time filters', async () => {
    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {},
    });
    assert.isOk(donationsResponse.data.data.donations);
    const allDonationsCount = await Donation.count();
    assert.equal(
      donationsResponse.data.data.donations.length,
      allDonationsCount,
    );
  });
  it('should get result when sending fromDate', async () => {
    const oldDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    oldDonation.createdAt = moment(
      '20220212 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await oldDonation.save();

    const newDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    newDonation.createdAt = moment(
      '20220312 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await newDonation.save();

    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        fromDate: '20220215 00:00:01',
      },
    });
    assert.isOk(donationsResponse.data.data.donations);
    const allDonationsCount = await Donation.count();
    assert.notEqual(
      donationsResponse.data.data.donations.length,
      allDonationsCount,
    );
    assert.notOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === oldDonation.id,
      ),
    );
    assert.isOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === newDonation.id,
      ),
    );
  });
  it('should get result when sending toDate', async () => {
    const oldDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    oldDonation.createdAt = moment(
      '20220212 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await oldDonation.save();

    const newDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    newDonation.createdAt = moment(
      '20220312 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await newDonation.save();

    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        toDate: '20220215 00:00:01',
      },
    });
    assert.isOk(donationsResponse.data.data.donations);
    const allDonationsCount = await Donation.count();
    assert.notEqual(
      donationsResponse.data.data.donations.length,
      allDonationsCount,
    );
    assert.isOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === oldDonation.id,
      ),
    );
    assert.notOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === newDonation.id,
      ),
    );
  });
  it('should get result when sending toDate and fromDate', async () => {
    const oldDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    oldDonation.createdAt = moment(
      '20220212 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await oldDonation.save();

    const newDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    newDonation.createdAt = moment(
      '20220312 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await newDonation.save();
    const veryNewDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );
    veryNewDonation.createdAt = moment(
      '20220320 00:00:00',
      'YYYYMMDD HH:mm:ss',
    ).toDate();
    await veryNewDonation.save();

    const donationsResponse = await axios.post(graphqlUrl, {
      query: fetchAllDonationsQuery,
      variables: {
        fromDate: '20220310 00:00:01',
        toDate: '20220315 00:00:01',
      },
    });
    assert.isOk(donationsResponse.data.data.donations);
    const allDonationsCount = await Donation.count();
    assert.notEqual(
      donationsResponse.data.data.donations.length,
      allDonationsCount,
    );
    assert.isOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === newDonation.id,
      ),
    );

    assert.notOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === oldDonation.id,
      ),
    );
    assert.notOk(
      donationsResponse.data.data.donations.find(
        d => Number(d.id) === veryNewDonation.id,
      ),
    );
  });
}

function saveDonationTestCases() {
  it('should save GIV donation for giveth project on xdai successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.saveDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should save GIV donation for giveth project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.saveDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should save custom token donation for giveth project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'CUSTOM_TOKEN',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.saveDonation,
    );
    assert.isFalse(donation?.isTokenEligibleForGivback);
  });
  it('should save GIV donation for trace project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.saveDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should save custom token donation for trace project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'CUSTOM_TOKEN',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.saveDonation,
    );
    assert.isFalse(donation?.isTokenEligibleForGivback);
  });

  it('should save GIV donation for trace project on xdai successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.TRACE,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.saveDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should throw error when save GIV donation for givingBlock project on xdai', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  it('should throw error when save GIV donation for givingBlock project on mainnet', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  // simulates staging env they only accept ETH
  it('should save ETH donation for CHANGE project on Ropsten successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.ROPSTEN,
          transactionNetworkId: NETWORK_IDS.ROPSTEN,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
  });
  // for production they only accept ETH on mainnet
  it('should save ETH donation for CHANGE project on Mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
  });
  // they do not accept DAI (same would apply for any other random token)
  it('should throw error when save DAI donation for CHANGE project on mainnet', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'DAI',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  // they do not accept DAI (same would apply for any other random token)
  it('should throw error when save DAI donation for CHANGE project on Xdai Chain', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'XDAI',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
    );
  });
  it('should save ETH donation for givingBlock project on mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVING_BLOCK,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.MAIN_NET,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.saveDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should save GIV donation for not logged-in users successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const saveDonationResponse = await axios.post(graphqlUrl, {
      query: saveDonation,
      variables: {
        projectId: project.id,
        chainId: NETWORK_IDS.XDAI,
        transactionNetworkId: NETWORK_IDS.XDAI,
        fromAddress: SEED_DATA.FIRST_USER.walletAddress,
        toAddress: project.walletAddress,
        transactionId: generateRandomTxHash(),
        amount: 10,
        token: 'GIV',
      },
    });
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.saveDonation,
    });
    assert.isTrue(donation?.isTokenEligibleForGivback);
    assert.isOk(donation);
    assert.isNull(donation?.userId);
  });
  it('should save donation anonymously for logged-in users successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          anonymous: true,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.saveDonation,
    });
    assert.isOk(donation);
    assert.equal(donation?.userId, user.id);
    assert.isTrue(donation?.anonymous);
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should fill usd value of donation after creation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.saveDonation,
    });
    assert.isOk(donation);
    assert.isOk(donation?.valueUsd);
    assert.isOk(donation?.priceUsd);
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should donation have true for segmentNotified after creation', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.saveDonation,
    });
    assert.isOk(donation);
    assert.isTrue(donation?.segmentNotified);
  });
  it('should throw exception when send invalid projectId', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: 999999,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.PROJECT_NOT_FOUND,
    );
  });
  it('should throw exception when send invalid toWalletAddress', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: 'invalidWalletAddress',
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS,
    );
  });
  it('should throw exception when toWalletAddress and projectId dont match', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: generateRandomEtheriumAddress(),
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS,
    );
  });
  it('should isProjectVerified be true after create donation for verified projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: true,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.saveDonation,
    });
    assert.isOk(donation);
    assert.isTrue(donation?.isProjectVerified);
  });
  it('should isProjectVerified be true after create donation for unVerified projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.saveDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.saveDonation,
    });
    assert.isOk(donation);
    assert.isFalse(donation?.isProjectVerified);
  });
  it('should throw exception when donating to draft projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.drafted,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: generateRandomEtheriumAddress(),
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
    );
  });
  it('should throw exception when donating to cancelled projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.cancelled,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: generateRandomEtheriumAddress(),
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
    );
  });
  it('should throw exception when donating to deactivated projects', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      statusId: ProjStatus.deactive,
    });
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: SEED_DATA.FIRST_USER.walletAddress,
          toAddress: generateRandomEtheriumAddress(),
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
    );
  });
}

function donationsFromWalletsTestCases() {
  const walletAddress1 = generateRandomEtheriumAddress();
  const walletAddress2 = generateRandomEtheriumAddress();
  const walletAddress3 = generateRandomEtheriumAddress();
  const walletAddress4 = generateRandomEtheriumAddress();
  it('should find donations with special source successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user1 = await User.create({
      walletAddress: walletAddress1,
      loginType: 'wallet',
      firstName: 'fatemeTest1',
    }).save();
    const accessToken1 = await generateTestAccessToken(user1.id);
    const donation1 = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: walletAddress1,
          toAddress: project.walletAddress,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken1}`,
        },
      },
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress1],
        },
      },
      {},
    );
    let test = true;
    result.data.data.donationsFromWallets.forEach(item => {
      if (item.fromWalletAddress !== walletAddress1) {
        test = false;
      }
    });
    assert.equal(test, true);
  });
  it('should find donations with special source in uppercase successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user4 = await User.create({
      walletAddress: walletAddress4,
      loginType: 'wallet',
      firstName: 'fatemeTest44',
    }).save();
    const accessToken4 = await generateTestAccessToken(user4.id);
    await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: walletAddress4,
          toAddress: walletAddress3,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken4}`,
        },
      },
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress1.toUpperCase()],
        },
      },
      {},
    );
    let test = true;
    result.data.data.donationsFromWallets.forEach(item => {
      if (item.fromWalletAddress !== walletAddress1) {
        test = false;
      }
    });
    assert.equal(test, true);
  });
  it('should find donations with special source unsuccessfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user2 = await User.create({
      walletAddress: walletAddress2,
      loginType: 'wallet',
      firstName: 'fatemeTest2',
    }).save();
    const accessToken2 = await generateTestAccessToken(user2.id);
    await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: walletAddress2,
          toAddress: walletAddress3,
          transactionId: generateRandomTxHash(),
          amount: 10,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken2}`,
        },
      },
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress3],
        },
      },
      {},
    );
    let test = false;
    result.data.data.donationsFromWallets.forEach(item => {
      if (item.fromWalletAddress === walletAddress2) {
        test = true;
      }
    });
    assert.equal(test, false);
  });
}

function donationsByProjectIdTestCases() {
  it('should sort by the createdAt DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'CreationDate',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(Number(donations[0].id), DONATION_SEED_DATA.FIFTH_DONATION.id);
  });
  it('should sort by createdAt ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.isTrue(donations[1].createdAt >= donations[0].createdAt);
  });
  it('should sort by amount DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'TokenAmount',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0].id),
      DONATION_SEED_DATA.SECOND_DONATION.id,
    );
  });
  it('should sort by amount ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'TokenAmount',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(Number(donations[0].id), DONATION_SEED_DATA.FIFTH_DONATION.id);
  });
  it('should sort by valueUsd DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'UsdAmount',
            direction: 'DESC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0].id),
      DONATION_SEED_DATA.SECOND_DONATION.id,
    );
  });
  it('should sort by valueUsd ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          orderBy: {
            field: 'UsdAmount',
            direction: 'ASC',
          },
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(Number(donations[0].id), DONATION_SEED_DATA.FIFTH_DONATION.id);
  });
  it('should search by user name except anonymous donations', async () => {
    const anonymousDonation = await saveDonationDirectlyToDb(
      createDonationData(),
      SEED_DATA.THIRD_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    anonymousDonation.anonymous = true;
    await anonymousDonation.save();

    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: 'third',
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      Number(donations[0]?.id),
      DONATION_SEED_DATA.FIFTH_DONATION.id,
    );

    const anonymousDonations = donations.filter(d => d.anonymous === true);
    assert.isTrue(anonymousDonations.length === 0);
  });
  it('should search by donation amount', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: '100',
        },
      },
      {},
    );

    const amountDonationsCount = await Donation.createQueryBuilder('donation')
      .where('donation.amount = :amount', { amount: 100 })
      .getCount();
    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(donations[0]?.amount, 100);
    assert.equal(donations.length, amountDonationsCount);
  });
  it('should search by donation currency', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: DONATION_SEED_DATA.FIRST_DONATION.currency, // GIV
        },
      },
      {},
    );

    const GivDonationsCount = await Donation.createQueryBuilder('donation')
      .where('donation.currency = :currency', {
        currency: DONATION_SEED_DATA.FIRST_DONATION.currency,
      })
      .getCount();

    const donations = result.data.data.donationsByProjectId.donations;
    assert.equal(
      donations[0]?.currency,
      DONATION_SEED_DATA.FIRST_DONATION.currency,
    );
    assert.equal(donations.length, GivDonationsCount);
  });
  it('should search by donation ToWalletAddress', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByProjectIdQuery,
        variables: {
          projectId: SEED_DATA.FIRST_PROJECT.id,
          searchTerm: DONATION_SEED_DATA.FIRST_DONATION.toWalletAddress,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByProjectId.donations;
    donations.forEach(d =>
      assert.equal(d.toWalletAddress, SEED_DATA.FIRST_PROJECT.walletAddress),
    );

    assert.isTrue(donations.length > 0);
  });
}

function donationsByUserIdTestCases() {
  it('should sort by tokens donated DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'TokenAmount',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(donations[0].amount > donations[donationsCount - 1].amount);
  });
  it('should sort by tokens donated ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'TokenAmount',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(donations[0].amount < donations[donationsCount - 1].amount);
  });
  it('should sort by USD value donated DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'UsdAmount',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      donations[0].valueUsd > donations[donationsCount - 1].valueUsd,
    );
  });
  it('should sort by USD value donated ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'UsdAmount',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      donations[0].valueUsd < donations[donationsCount - 1].valueUsd,
    );
  });
  it('should sort by createdAt DESC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'DESC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      Date.parse(donations[0].createdAt) >
        Date.parse(donations[donationsCount - 1].createdAt),
    );
  });
  it('should sort by createdAt ASC', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: SEED_DATA.FIRST_USER.id,
        },
      },
      {},
    );

    const donations = result.data.data.donationsByUserId.donations;
    const donationsCount = donations.length;
    assert.isTrue(
      Date.parse(donations[0].createdAt) <
        Date.parse(donations[donationsCount - 1].createdAt),
    );
  });
  describe('with default createdAt DESC sort', () => {
    it('should paginate results by indicated take and skip', async () => {
      const result = await axios.post(
        graphqlUrl,
        {
          query: fetchDonationsByUserIdQuery,
          variables: {
            take: 1,
            skip: 1,
            userId: SEED_DATA.FIRST_USER.id,
          },
        },
        {},
      );

      const donations = result.data.data.donationsByUserId.donations;
      const donationsCount = donations.length;
      assert.equal(donationsCount, 1);
      assert.isTrue(
        donations[0].id !== String(DONATION_SEED_DATA.FIFTH_DONATION.id),
      );
    });
  });
}

function donationsByDonorTestCases() {
  it('should return the user made donations', async () => {
    const firstUserAccessToken = await generateTestAccessToken(
      SEED_DATA.FIRST_USER.id,
    );
    const firstUserDonations = await Donation.find({
      where: { user: { id: SEED_DATA.FIRST_USER.id } },
    });
    const firstUserResult = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );

    const secondUserAccessToken = await generateTestAccessToken(
      SEED_DATA.SECOND_USER.id,
    );
    const secondUserResult = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {
        headers: {
          Authorization: `Bearer ${secondUserAccessToken}`,
        },
      },
    );

    assert.equal(
      firstUserResult.data.data.donationsByDonor.length,
      firstUserDonations.length,
    );
    assert.equal(
      firstUserResult.data.data.donationsByDonor[0].fromWalletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    assert.equal(
      firstUserResult.data.data.donationsByDonor[1].fromWalletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    // second user has no donations
    assert.deepEqual(secondUserResult.data.data.donationsByDonor, []);
  });
  it('should return <<Login Required>> error if user is not signed in', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByDonorQuery,
      },
      {},
    );
    assert.equal(
      result.data.errors[0].message,
      errorMessages.DONATION_VIEWING_LOGIN_REQUIRED,
    );
  });
}
