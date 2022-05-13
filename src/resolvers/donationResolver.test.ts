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
  generateUserIdLessAccessToken,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import { errorMessages } from '../utils/errorMessages';
import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  fetchDonationsByUserIdQuery,
  fetchDonationsByDonorQuery,
  saveDonation,
  fetchDonationsByProjectIdQuery,
  fetchAllDonationsQuery,
  donationsToWallets,
  donationsFromWallets,
  createDonationMutation,
  updateDonationStatusMutation,
} from '../../test/graphqlQueries';
import { NETWORK_IDS } from '../provider';
import { User } from '../entities/user';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { ProjStatus } from '../entities/project';
import { Token } from '../entities/token';
import { IsUppercase } from 'class-validator';
import { findDonationById } from '../repositories/donationRepository';

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

// TODO Write test cases
describe('donations() test cases', donationsTestCases);
describe('donationsByProjectId() test cases', donationsByProjectIdTestCases);
describe('donationByUserId() test cases', donationsByUserIdTestCases);
// describe('tokens() test cases', tokensTestCases);
describe('donationsByDonor() test cases', donationsByDonorTestCases);
describe('saveDonation() test cases', saveDonationTestCases);
describe('createDonation() test cases', createDonationTestCases);
describe('updateDonationStatus() test cases', updateDonationStatusTestCases);
describe('donationsToWallets() test cases', donationsToWalletsTestCases);
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

          // custom token
          token: 'ABCD',
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
  it('should save DOGE donation for projects in mainnet as nonEligible', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVETH,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const token = Token.create({
      name: 'Doge not eligible',
      symbol: 'DOGE',
      address: '0x30cf203b48edaa42c3b4918e955fed26cd012a23',
      decimals: 18,
      isGivbackEligible: false,
      networkId: 1,
    });
    await token.save();
    const givethOrganization = (await Organization.findOne({
      label: ORGANIZATION_LABELS.GIVETH,
    })) as Organization;

    await Token.query(
      `INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id})
      ;`,
    );
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
          token: 'DOGE',
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
    // DOGE is in the list but not eligible
    assert.isFalse(donation?.isTokenEligibleForGivback);
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

          // custom token
          token: 'ABCD',
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
  it('should save GIV donation for not logged-in users succesfully, but wallet belongs to a user', async () => {
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
    const user = await User.findOne({
      walletAddress: SEED_DATA.FIRST_USER.walletAddress,
    });
    // there will always be an userId present
    // login resolvers always create an user even if profile not completed
    assert.isTrue(user?.id === donation?.userId);
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
  it('should save donation anonymously with userId for jwt without userId', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const newUserWalletAddress = generateRandomEtheriumAddress();
    const user = await User.create({
      walletAddress: newUserWalletAddress,
      loginType: 'wallet',
      firstName: 'first name',
    }).save();
    const accessToken = await generateUserIdLessAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: user.walletAddress,
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
  it('should throw exception when amount is zero', async () => {
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
          amount: 0,
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
      errorMessages.AMOUNT_IS_INVALID,
    );
  });
  it('should throw exception when amount is negative', async () => {
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
          amount: -10,
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
      errorMessages.AMOUNT_IS_INVALID,
    );
  });
  it('should throw exception when currency is not valid when currency contain number', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'fatemeTest1',
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
          token: 'GIV999999',
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
      errorMessages.CURRENCY_IS_INVALID,
    );
  });
  it('should throw exception when currency is not valid when currency length more than 10', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'fatemeTest',
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
          token: 'GIVGIVGIVGIV',
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
      errorMessages.CURRENCY_IS_INVALID,
    );
  });
}

function createDonationTestCases() {
  it('should create GIV donation for giveth project on xdai successfully', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 1,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.createDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should create GIV donation for giveth project on mainnet successfully', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          anonymous: false,
          nonce: 3,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.createDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
    assert.isFalse(donation?.anonymous);
    assert.isFalse(donation?.segmentNotified);
    assert.equal(donation?.status, DONATION_STATUS.PENDING);
  });
  it('should create custom token donation for giveth project on mainnet successfully', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          nonce: 4,
          amount: 10,
          token: 'ABCD',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.createDonation,
    );
    assert.isFalse(donation?.isTokenEligibleForGivback);
  });
  it('should create GIV donation for trace project on mainnet successfully', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          nonce: 5,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.createDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should create Not Eligible donation donation for projects in mainnet as nonEligible', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.GIVETH,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const token = Token.create({
      name: 'Not eligible',
      symbol: 'NonEligible',
      address: generateRandomEtheriumAddress(),
      decimals: 18,
      isGivbackEligible: false,
      networkId: 1,
    });
    await token.save();
    const givethOrganization = (await Organization.findOne({
      label: ORGANIZATION_LABELS.GIVETH,
    })) as Organization;

    await Token.query(
      `INSERT INTO organization_tokens_token ("tokenId","organizationId") VALUES
        (${token.id}, ${givethOrganization.id})
      ;`,
    );
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          nonce: 10,
          amount: 10,
          token: 'DOGE',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.createDonation,
    );
    // DOGE is in the list but not eligible
    assert.isFalse(donation?.isTokenEligibleForGivback);
  });
  it('should create custom token donation for trace project on mainnet successfully', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          amount: 10,
          nonce: 11,
          // custom token
          token: 'ABCD',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.createDonation,
    );
    assert.isFalse(donation?.isTokenEligibleForGivback);
  });

  it('should create GIV donation for trace project on xdai successfully', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 12,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.createDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should throw error when create GIV donation for givingBlock project on xdai', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 11,
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
  it('should throw error when create GIV donation for givingBlock project on mainnet', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          nonce: 13,
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
  it('should create ETH donation for CHANGE project on Ropsten successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.ROPSTEN,
          transactionId: generateRandomTxHash(),
          amount: 10,
          nonce: 11,
          token: 'ETH',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
  });
  // for production they only accept ETH on mainnet
  it('should create ETH donation for CHANGE project on Mainnet successfully', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          nonce: 13,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
  });
  // they do not accept DAI (same would apply for any other random token)
  it('should throw error when create DAI donation for CHANGE project on mainnet', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          nonce: 14,
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
  it('should throw error when create DAI donation for CHANGE project on Xdai Chain', async () => {
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      organizationLabel: ORGANIZATION_LABELS.CHANGE,
    });
    const user = await User.findOne({ id: SEED_DATA.ADMIN_USER.id });
    const accessToken = await generateTestAccessToken(user!.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          amount: 10,
          nonce: 13,
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
  it('should create ETH donation for givingBlock project on mainnet successfully', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.MAIN_NET,
          transactionId: generateRandomTxHash(),
          nonce: 15,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne(
      saveDonationResponse.data.data.createDonation,
    );
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should throw exception when creating donation for not logged-in users', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const saveDonationResponse = await axios.post(graphqlUrl, {
      query: createDonationMutation,
      variables: {
        projectId: project.id,
        transactionNetworkId: NETWORK_IDS.XDAI,
        transactionId: generateRandomTxHash(),
        nonce: 3,
        amount: 10,
        token: 'GIV',
      },
    });
    assert.equal(
      saveDonationResponse.data.errors[0].message,
      errorMessages.UN_AUTHORIZED,
    );
  });
  it('should create donation anonymously successfully', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          anonymous: true,
          transactionId: generateRandomTxHash(),
          nonce: 4,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.createDonation,
    });
    assert.isOk(donation);
    assert.equal(donation?.userId, user.id);
    assert.isTrue(donation?.anonymous);
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });

  it('should fill usd value of when creating donation', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 12,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.createDonation,
    });
    assert.isOk(donation);
    assert.isOk(donation?.valueUsd);
    assert.isOk(donation?.priceUsd);
    assert.isTrue(donation?.isTokenEligibleForGivback);
  });
  it('should donation have false for segmentNotified after creation', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          amount: 10,
          nonce: 6,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.createDonation,
    });
    assert.isOk(donation);
    assert.isFalse(donation?.segmentNotified);
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
        query: createDonationMutation,
        variables: {
          projectId: 999999,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 13,
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 1,
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
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.createDonation,
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          amount: 10,
          nonce: 11,
          token: 'GIV',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isOk(saveDonationResponse.data.data.createDonation);
    const donation = await Donation.findOne({
      id: saveDonationResponse.data.data.createDonation,
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 12,
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          amount: 10,
          nonce: 14,
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 15,
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
  it('should throw exception when amount is zero', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 11,
          amount: 0,
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
      '"amount" must be greater than 0',
    );
  });
  it('should throw exception when amount is negative', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 11,
          amount: -10,
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
      '"amount" must be greater than 0',
    );
  });
  it('should throw exception when transactionId is invalid', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: 'fjdahfksj0323423',
          nonce: 11,
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
      errorMessages.INVALID_TRANSACTION_ID,
    );
  });
  it('should throw exception when transactionNetworkId is invalid', async () => {
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
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: 203,
          transactionId: generateRandomTxHash(),
          nonce: 11,
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
      '"transactionNetworkId" must be one of [1, 3, 100, 56]',
    );
  });
  it('should throw exception when currency is not valid when currency contain number', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'fatemeTest1',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 15,
          amount: 10,
          token: 'GIV999999',
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
      errorMessages.CURRENCY_IS_INVALID,
    );
  });
  it('should throw exception when currency is not valid when currency length more than 10', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress: generateRandomEtheriumAddress(),
      loginType: 'wallet',
      firstName: 'fatemeTest',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const saveDonationResponse = await axios.post(
      graphqlUrl,
      {
        query: createDonationMutation,
        variables: {
          projectId: project.id,
          transactionNetworkId: NETWORK_IDS.XDAI,
          transactionId: generateRandomTxHash(),
          nonce: 10,
          amount: 10,
          token: 'GIVGIVGIVGIV',
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
      errorMessages.CURRENCY_IS_INVALID,
    );
  });
}

function donationsFromWalletsTestCases() {
  it('should find donations with special source successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    const user = await User.create({
      walletAddress,
      loginType: 'wallet',
      firstName: 'fatemeTest1',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const donation = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: walletAddress,
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

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    result.data.data.donationsFromWallets.forEach(item => {
      assert.equal(item.fromWalletAddress, walletAddress);
    });
  });
  it('should find donations with special source in uppercase successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    const user = await User.create({
      walletAddress,
      loginType: 'wallet',
      firstName: 'fatemeTest2',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const donation = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: walletAddress,
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
    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress.toUpperCase()],
        },
      },
      {},
    );

    result.data.data.donationsFromWallets.forEach(item => {
      assert.equal(item.fromWalletAddress, walletAddress);
    });
  });
  it('should find donations with special source unsuccessfully', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const walletAddress1 = generateRandomEtheriumAddress();
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await User.create({
      walletAddress,
      loginType: 'wallet',
      firstName: 'fatemeTest1',
    }).save();
    const accessToken = await generateTestAccessToken(user.id);
    const donation = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: walletAddress,
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
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    result.data.data.donationsFromWallets.forEach(item => {
      assert.notEqual(item.fromWalletAddress, walletAddress1);
    });
  });
  it('should find no donations with this source ', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsFromWallets,
        variables: {
          fromWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    assert.equal(result.data.data.donationsFromWallets.length, 0);
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
    assert.isTrue(donations[0].amount <= donations[donationsCount - 1].amount);
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
      donations[0].valueUsd <= donations[donationsCount - 1].valueUsd,
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
  it('should not find anonymous donation', async () => {
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
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: SEED_DATA.THIRD_USER.id,
        },
      },
      {},
    );

    result.data.data.donationsByUserId.donations.forEach(item => {
      assert.equal(item.anonymous, false);
    });
  });
  it('should  find his/her own anonymous donation for logged in user', async () => {
    const user = await User.create({
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    }).save();
    const title = String(new Date().getTime());
    const projectData = {
      // title: `test project`,
      title,
      description: 'test description',
      walletAddress: generateRandomEtheriumAddress(),
      categories: ['food1'],
      verified: true,
      listed: true,
      giveBacks: false,
      creationDate: new Date(),
      updatedAt: new Date(),
      slug: title,
      // firstUser's id
      admin: String(user.id),
      qualityScore: 30,
      // just need the initial value to be different than 0
      totalDonations: 10,
      totalReactions: 0,
      totalProjectUpdates: 1,
    };
    const firstUserAccessToken = await generateTestAccessToken(user.id);
    const project = await saveProjectDirectlyToDb(projectData);

    const donationData = {
      transactionId: generateRandomTxHash(),
      transactionNetworkId: NETWORK_IDS.MAIN_NET,
      toWalletAddress: generateRandomEtheriumAddress(),
      fromWalletAddress: generateRandomEtheriumAddress(),
      currency: 'ETH',
      anonymous: true,
      amount: 10,
      valueUsd: 15,
      userId: user.id,
      projectId: project.id,
      createdAt: moment(),
      segmentNotified: true,
    };

    const anonymousDonation = await saveDonationDirectlyToDb(
      donationData,
      user.id,
      project.id,
    );

    anonymousDonation.anonymous = true;
    await anonymousDonation.save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: user.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${firstUserAccessToken}`,
        },
      },
    );
    assert.equal(
      String(result.data.data.donationsByUserId.donations[0].user.id),
      String(user.id),
    );
    assert.equal(
      result.data.data.donationsByUserId.donations[0].anonymous,
      true,
    );
  });
  it('should  find just not anonymous donation for user is not login', async () => {
    const user = await User.create({
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    }).save();
    const title = String(new Date().getTime());
    const projectData = {
      // title: `test project`,
      title,
      description: 'test description',
      walletAddress: generateRandomEtheriumAddress(),
      categories: ['food1'],
      verified: true,
      listed: true,
      giveBacks: false,
      creationDate: new Date(),
      updatedAt: new Date(),
      slug: title,
      // firstUser's id
      admin: String(user.id),
      qualityScore: 30,
      // just need the initial value to be different than 0
      totalDonations: 10,
      totalReactions: 0,
      totalProjectUpdates: 1,
    };
    const project = await saveProjectDirectlyToDb(projectData);

    const donationDataAnonymous = {
      transactionId: generateRandomTxHash(),
      transactionNetworkId: NETWORK_IDS.MAIN_NET,
      toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
      fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
      currency: 'ETH',
      anonymous: true,
      amount: 15,
      valueUsd: 15,
      userId: user.id,
      projectId: project.id,
      createdAt: moment(),
      segmentNotified: true,
    };

    const donationDataNotAnonymous = {
      transactionId: generateRandomTxHash(),
      transactionNetworkId: NETWORK_IDS.MAIN_NET,
      toWalletAddress: SEED_DATA.FIRST_PROJECT.walletAddress,
      fromWalletAddress: SEED_DATA.FIRST_USER.walletAddress,
      currency: 'ETH',
      anonymous: false,
      amount: 15,
      valueUsd: 15,
      userId: user.id,
      projectId: project.id,
      createdAt: moment(),
      segmentNotified: true,
    };

    const notAnonymousDonation = await saveDonationDirectlyToDb(
      donationDataNotAnonymous,
      user.id,
      project.id,
    );

    const anonymousDonation = await saveDonationDirectlyToDb(
      donationDataAnonymous,
      user.id,
      project.id,
    );

    notAnonymousDonation.anonymous = false;
    anonymousDonation.anonymous = true;
    await notAnonymousDonation.save();
    await anonymousDonation.save();
    const result = await axios.post(
      graphqlUrl,
      {
        query: fetchDonationsByUserIdQuery,
        variables: {
          orderBy: {
            field: 'CreationDate',
            direction: 'ASC',
          },
          userId: user.id,
        },
      },
      {},
    );
    assert.equal(
      String(result.data.data.donationsByUserId.donations[0].user.id),
      String(user.id),
    );
    assert.equal(result.data.data.donationsByUserId.donations.length, 1);
    assert.equal(
      result.data.data.donationsByUserId.donations[0].anonymous,
      false,
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

function donationsToWalletsTestCases() {
  it('should find donations with special destination successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    const user = await User.create({
      walletAddress,
      loginType: 'wallet',
      firstName: 'donationsToWalletTest1User',
    }).save();
    const accessToken1 = await generateTestAccessToken(user.id);
    const donation = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: project.walletAddress,
          toAddress: walletAddress,
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
        query: donationsToWallets,
        variables: {
          toWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    result.data.data.donationsToWallets.forEach(item => {
      assert.equal(item.toWalletAddress, walletAddress);
    });
  });
  it('should find donations with special destination in uppercase successfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    const user = await User.create({
      walletAddress,
      loginType: 'wallet',
      firstName: 'donationsToWalletTest2User',
    }).save();
    const accessToken1 = await generateTestAccessToken(user.id);
    const donation = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: project.walletAddress,
          toAddress: walletAddress,
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
        query: donationsToWallets,
        variables: {
          toWalletAddresses: [walletAddress.toUpperCase()],
        },
      },
      {},
    );
    result.data.data.donationsToWallets.forEach(item => {
      assert.equal(item.toWalletAddress, walletAddress);
    });
  });
  it('should find donations with special destination unsuccessfully', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const walletAddress = generateRandomEtheriumAddress();
    const walletAddress1 = generateRandomEtheriumAddress();
    const user = await User.create({
      walletAddress,
      loginType: 'wallet',
      firstName: 'donationsToWalletTest3User',
    }).save();
    const accessToken1 = await generateTestAccessToken(user.id);
    const donation = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: project.walletAddress,
          toAddress: walletAddress,
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
    const donation1 = await axios.post(
      graphqlUrl,
      {
        query: saveDonation,
        variables: {
          projectId: project.id,
          chainId: NETWORK_IDS.XDAI,
          transactionNetworkId: NETWORK_IDS.XDAI,
          fromAddress: project.walletAddress,
          toAddress: walletAddress1,
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
        query: donationsToWallets,
        variables: {
          toWalletAddresses: [walletAddress1],
        },
      },
      {},
    );
    result.data.data.donationsToWallets.forEach(item => {
      assert.notEqual(item.toWalletAddress, walletAddress);
    });
  });
  it('should find no donations with this destination ', async () => {
    const walletAddress = generateRandomEtheriumAddress();
    const result = await axios.post(
      graphqlUrl,
      {
        query: donationsToWallets,
        variables: {
          toWalletAddresses: [walletAddress],
        },
      },
      {},
    );
    assert.equal(result.data.data.donationsToWallets.length, 0);
  });
}

function updateDonationStatusTestCases() {
  it('should update donation status to verified after calling without sending status', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0xaaf96af4d0634dafcac1b6eca627b77ceb157aad1037033761ed3a4220ebb2b5
    const transactionInfo = {
      txHash:
        '0xaaf96af4d0634dafcac1b6eca627b77ceb157aad1037033761ed3a4220ebb2b5',
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: '0x00d18ca9782be1caef611017c2fbc1a39779a57c',
      toAddress: '0x90b31c07fb0310b4b0d88368169dad8fe0cbb6da',
      currency: 'XDAI',
      timestamp: 1647483910,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 1,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    assert.equal(donation.status, DONATION_STATUS.PENDING);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateDonationStatusMutation,
        variables: {
          donationId: donation.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateDonationStatus.status,
      DONATION_STATUS.VERIFIED,
    );
  });
  it('should update donation status to failed after calling without sending status ', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x6c2550e21d57d2c9c7e1cb22c0c4d6581575c77f9be2ef35995466e61c730a08
    const transactionInfo = {
      txHash:
        '0x6c2550e21d57d2c9c7e1cb22c0c4d6581575c77f9be2ef35995466e61c730a08',
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: '0x42a7d872dec08d309f4b93d05e5b9de183765858',
      currency: 'GIV',
      timestamp: 1647069070,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 1,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    assert.equal(donation.status, DONATION_STATUS.PENDING);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateDonationStatusMutation,
        variables: {
          donationId: donation.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateDonationStatus.status,
      DONATION_STATUS.FAILED,
    );
    assert.equal(
      result.data.data.updateDonationStatus.verifyErrorMessage,
      errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
    );
  });
  it('should donation status remain pending after calling without sending status (we assume its not mined so far)', async () => {
    const transactionInfo = {
      txHash: generateRandomTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 1,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    assert.equal(donation.status, DONATION_STATUS.PENDING);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateDonationStatusMutation,
        variables: {
          donationId: donation.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateDonationStatus.status,
      DONATION_STATUS.PENDING,
    );
  });

  it('should update donation status to verified ', async () => {
    // https://etherscan.io/tx/0xe42fd848528dcb06f56fd3b553807354b4bf0ff591454e1cc54070684d519df5
    const transactionInfo = {
      txHash:
        '0xe42fd848528dcb06f56fd3b553807354b4bf0ff591454e1cc54070684d519df5',
      networkId: NETWORK_IDS.MAIN_NET,
      amount: 500,
      fromAddress: '0x5d28fe1e9f895464aab52287d85ebff32b351674',
      toAddress: '0x0eed1566f46b0421d53d2143a3957bb22016ef4b',
      currency: 'GIV',
      timestamp: 1646704855,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 1,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    assert.equal(donation.status, DONATION_STATUS.PENDING);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateDonationStatusMutation,
        variables: {
          donationId: donation.id,

          // We send faild but because it checks with network first, it ignores sent status
          status: DONATION_STATUS.FAILED,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateDonationStatus.status,
      DONATION_STATUS.VERIFIED,
    );
  });
  it('should update donation status to failed', async () => {
    // https://blockscout.com/xdai/mainnet/tx/0x013c3371c1de181439ac51067fd2e417b71b9d462c13417252e2153f80af630f
    const transactionInfo = {
      txHash:
        '0x013c3371c1de181439ac51067fd2e417b71b9d462c13417252e2153f80af630f',
      networkId: NETWORK_IDS.XDAI,
      amount: 2800,
      fromAddress: '0x5d28fe1e9f895464aab52287d85ebff32b351674',
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1646725075,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 1,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    assert.equal(donation.status, DONATION_STATUS.PENDING);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateDonationStatusMutation,
        variables: {
          donationId: donation.id,
          status: DONATION_STATUS.FAILED,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateDonationStatus.status,
      DONATION_STATUS.FAILED,
    );
    assert.equal(
      result.data.data.updateDonationStatus.verifyErrorMessage,
      errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
    );
  });
  it('should update donation status to failed, tx is not mined and donor says it failed', async () => {
    const transactionInfo = {
      txHash: generateRandomTxHash(),
      networkId: NETWORK_IDS.XDAI,
      amount: 1,
      fromAddress: generateRandomEtheriumAddress(),
      toAddress: generateRandomEtheriumAddress(),
      currency: 'GIV',
      timestamp: 1647069070,
    };
    const project = await saveProjectDirectlyToDb({
      ...createProjectData(),
      walletAddress: transactionInfo.toAddress,
    });
    const user = await saveUserDirectlyToDb(transactionInfo.fromAddress);
    const donation = await saveDonationDirectlyToDb(
      {
        amount: transactionInfo.amount,
        transactionNetworkId: transactionInfo.networkId,
        transactionId: transactionInfo.txHash,
        currency: transactionInfo.currency,
        fromWalletAddress: transactionInfo.fromAddress,
        toWalletAddress: transactionInfo.toAddress,
        valueUsd: 1,
        anonymous: false,
        createdAt: new Date(transactionInfo.timestamp),
        status: DONATION_STATUS.PENDING,
      },
      user.id,
      project.id,
    );
    assert.equal(donation.status, DONATION_STATUS.PENDING);
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateDonationStatusMutation,
        variables: {
          donationId: donation.id,
          status: DONATION_STATUS.FAILED,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.updateDonationStatus.status,
      DONATION_STATUS.FAILED,
    );
    assert.equal(
      result.data.data.updateDonationStatus.verifyErrorMessage,
      errorMessages.DONOR_REPORTED_IT_AS_FAILED,
    );
  });
}
