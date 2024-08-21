// TODO Write test cases

import axios from 'axios';
import { assert } from 'chai';
import { User } from '../entities/user';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateRandomEvmTxHash,
  generateTestAccessToken,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveRecurringDonationDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import {
  refreshUserScores,
  sendCodeToConfirmEmail,
  updateUser,
  userByAddress,
  verifyUserEmailCode as verifyUserEmailCodeQuery,
  checkEmailAvailability as checkEmailAvailabilityQuery,
} from '../../test/graphqlQueries';
import {
  errorMessages,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { insertSinglePowerBoosting } from '../repositories/powerBoostingRepository';
import { DONATION_STATUS } from '../entities/donation';
import { getGitcoinAdapter } from '../adapters/adaptersFactory';
import { updateUserTotalDonated } from '../services/userService';
import { addNewAnchorAddress } from '../repositories/anchorContractAddressRepository';
import { NETWORK_IDS } from '../provider';
import { RECURRING_DONATION_STATUS } from '../entities/recurringDonation';

describe('updateUser() test cases', updateUserTestCases);
describe('userByAddress() test cases', userByAddressTestCases);
describe('refreshUserScores() test cases', refreshUserScoresTestCases);
describe(
  'sendUserEmailConfirmationCodeFlow() test cases',
  sendUserEmailConfirmationCodeFlow,
);
describe('verifyUserEmailCode() test cases', verifyUserEmailCode);
describe('checkEmailAvailability()', checkEmailAvailability);

// TODO I think we can delete  addUserVerification query
// describe('addUserVerification() test cases', addUserVerificationTestCases);
function refreshUserScoresTestCases() {
  it('should refresh user scores if the user has registered passport', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    await getGitcoinAdapter().submitPassport({
      address: userData.walletAddress,
    });
    const result = await axios.post(graphqlUrl, {
      query: refreshUserScores,
      variables: {
        address: userData.walletAddress,
      },
    });

    const updatedUser = result.data.data.refreshUserScores;
    assert.equal(updatedUser.walletAddress, user.walletAddress);
    assert.isTrue(updatedUser.passportScore > 0);
    assert.isTrue(updatedUser.passportStamps > 0);
  });
  it('should persist passportScore in user ', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    await getGitcoinAdapter().submitPassport({
      address: userData.walletAddress,
    });
    const result = await axios.post(graphqlUrl, {
      query: refreshUserScores,
      variables: {
        address: userData.walletAddress,
      },
    });

    const updatedUser = result.data.data.refreshUserScores;
    assert.equal(updatedUser.walletAddress, user.walletAddress);
    assert.isTrue(updatedUser.passportScore > 0);
    assert.isTrue(updatedUser.passportStamps > 0);

    const fetchUserResponse = await axios.post(graphqlUrl, {
      query: userByAddress,
      variables: {
        address: userData.walletAddress,
      },
    });

    assert.equal(
      fetchUserResponse.data.data.userByAddress.passportScore,
      updatedUser.passportScore,
    );
  });
}

function userByAddressTestCases() {
  it('Get non-sensitive fields of a user', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    await User.create(userData).save();
    const result = await axios.post(graphqlUrl, {
      query: userByAddress,
      variables: {
        address: userData.walletAddress,
      },
    });
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      userData.walletAddress,
    );
    assert.equal(result.data.data.userByAddress.avatar, userData.avatar);
    assert.equal(result.data.data.userByAddress.firstName, userData.firstName);
    assert.equal(result.data.data.userByAddress.lastName, userData.lastName);
    assert.isNotOk(result.data.data.userByAddress.role);
    assert.isNotOk(result.data.data.userByAddress.email);
    assert.equal(result.data.data.userByAddress.url, userData.url);
  });
  it('Get all fields of a user', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userByAddress,
        variables: {
          address: userData.walletAddress,
        },
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      userData.walletAddress,
    );
    assert.equal(result.data.data.userByAddress.avatar, userData.avatar);
    assert.equal(result.data.data.userByAddress.firstName, userData.firstName);
    assert.equal(result.data.data.userByAddress.lastName, userData.lastName);
    assert.isNotOk(result.data.data.userByAddress.role);
    assert.equal(result.data.data.userByAddress.email, userData.email);
    assert.equal(result.data.data.userByAddress.url, userData.url);
  });
  it('Get donationsCount and totalDonated correctly, when there is just one time donations', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    const project = await saveProjectDirectlyToDb(createProjectData());
    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 100,
        valueUsd: 100,
        currency: 'USDT',
        status: DONATION_STATUS.VERIFIED,
      },
      user.id,
      project.id,
    );

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 50,
        valueUsd: 50,
        currency: 'USDT',
        status: DONATION_STATUS.VERIFIED,
      },
      user.id,
      project.id,
    );
    await updateUserTotalDonated(user.id);

    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userByAddress,
        variables: {
          address: userData.walletAddress,
        },
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      userData.walletAddress,
    );
    assert.equal(result.data.data.userByAddress.donationsCount, 2);
    assert.equal(result.data.data.userByAddress.totalDonated, 150);
  });
  it('Get donationsCount and totalDonated correctly, when there is just recurringDonations, one active', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    const project = await saveProjectDirectlyToDb(createProjectData());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: user.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency: 'USDT',
        totalUsdStreamed: 200,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    await updateUserTotalDonated(user.id);

    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userByAddress,
        variables: {
          address: userData.walletAddress,
        },
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      userData.walletAddress,
    );
    assert.equal(result.data.data.userByAddress.totalDonated, 200);
    assert.equal(result.data.data.userByAddress.donationsCount, 1);
  });
  it('Get donationsCount and totalDonated correctly, when there is just recurringDonations, active, pending, failed, ended', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    const project = await saveProjectDirectlyToDb(createProjectData());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: user.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency: 'USDT',
        totalUsdStreamed: 200,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: user.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency: 'USDT',
        status: RECURRING_DONATION_STATUS.PENDING,
      },
    });

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: user.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency: 'USDT',
        totalUsdStreamed: 200,
        status: RECURRING_DONATION_STATUS.ENDED,
      },
    });

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: user.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency: 'USDT',
        status: RECURRING_DONATION_STATUS.FAILED,
      },
    });

    await updateUserTotalDonated(user.id);

    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userByAddress,
        variables: {
          address: userData.walletAddress,
        },
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      userData.walletAddress,
    );
    // for totalDonated we consider all recurring donations but for donationsCount we consider only active recurring donations
    assert.equal(result.data.data.userByAddress.totalDonated, 400);
    assert.equal(result.data.data.userByAddress.donationsCount, 2);
  });
  it('Get donationsCount and totalDonated correctly, when there is both recurringDonations and one time donation', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    const project = await saveProjectDirectlyToDb(createProjectData());

    await addNewAnchorAddress({
      project,
      owner: project.adminUser,
      creator: user,
      address: generateRandomEtheriumAddress(),
      networkId: NETWORK_IDS.OPTIMISTIC,
      txHash: generateRandomEvmTxHash(),
    });

    await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        amount: 50,
        valueUsd: 50,
        currency: 'USDT',
        status: DONATION_STATUS.VERIFIED,
      },
      user.id,
      project.id,
    );
    await updateUserTotalDonated(user.id);

    await saveRecurringDonationDirectlyToDb({
      donationData: {
        donorId: user.id,
        projectId: project.id,
        flowRate: '300',
        anonymous: false,
        currency: 'USDT',
        totalUsdStreamed: 200,
        status: RECURRING_DONATION_STATUS.ACTIVE,
      },
    });

    await updateUserTotalDonated(user.id);

    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userByAddress,
        variables: {
          address: userData.walletAddress,
        },
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      userData.walletAddress,
    );

    assert.equal(result.data.data.userByAddress.totalDonated, 250);
    assert.equal(result.data.data.userByAddress.donationsCount, 2);
  });

  // TODO write test cases for likedProjectsCount, donationsCount, projectsCount fields
  it('Return boostedProjectsCount of a user', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const thirdProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user,
      project: firstProject,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user,
      project: secondProject,
      percentage: 15,
    });
    await insertSinglePowerBoosting({
      user,
      project: thirdProject,
      percentage: 20,
    });
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userByAddress,
        variables: {
          address: user.walletAddress,
        },
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(result.data.data.userByAddress.boostedProjectsCount, 3);
  });
  it('Returns null when no user is found', async () => {
    const result = await axios.post(graphqlUrl, {
      query: userByAddress,
      variables: {
        address: 'random address that does not exist',
      },
    });
    assert.equal(result.data.data.userByAddress, null);
  });
  it('Return isSignedIn true, for loggedIn user', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userByAddress,
        variables: {
          address: userData.walletAddress,
        },
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      userData.walletAddress,
    );
    assert.isTrue(result.data.data.userByAddress.isSignedIn);
  });
  it('Return isSignedIn false, for not loggedIn user, getting another userInfo', async () => {
    const result = await axios.post(graphqlUrl, {
      query: userByAddress,
      variables: {
        address: SEED_DATA.FIRST_USER.walletAddress,
      },
    });
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    assert.isFalse(result.data.data.userByAddress.isSignedIn);
  });
  it('Return isSignedIn true, for loggedIn user, getting another userInfo', async () => {
    const result = await axios.post(
      graphqlUrl,
      {
        query: userByAddress,
        variables: {
          address: SEED_DATA.FIRST_USER.walletAddress,
        },
      },
      {
        headers: {
          authorization: `Bearer ${await generateTestAccessToken(
            SEED_DATA.SECOND_USER.id,
          )}`,
        },
      },
    );
    assert.equal(
      result.data.data.userByAddress.walletAddress,
      SEED_DATA.FIRST_USER.walletAddress,
    );
    assert.isTrue(result.data.data.userByAddress.isSignedIn);
  });
  it('should just count verified donations in donationsCount field', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.VERIFIED }),
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.PENDING }),
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.PENDING }),
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.FAILED }),
      user.id,
      project.id,
    );
    await saveDonationDirectlyToDb(
      createDonationData({ status: DONATION_STATUS.FAILED }),
      user.id,
      project.id,
    );

    const result = await axios.post(graphqlUrl, {
      query: userByAddress,
      variables: {
        address: user.walletAddress,
      },
    });
    assert.equal(result.data.data.userByAddress.donationsCount, 1);
  });
}

function updateUserTestCases() {
  it('should update user with sending all data', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isTrue(result.data.data.updateUser);
    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    assert.equal(updatedUser?.firstName, updateUserData.firstName);
    assert.equal(updatedUser?.lastName, updateUserData.lastName);
    assert.equal(updatedUser?.email, updateUserData.email);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
    assert.equal(
      updatedUser?.name,
      updateUserData.firstName + ' ' + updateUserData.lastName,
    );
  });
  it('should update user with sending all data and then call userByAddress query', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isTrue(result.data.data.updateUser);
    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    assert.equal(updatedUser?.firstName, updateUserData.firstName);
    assert.equal(updatedUser?.lastName, updateUserData.lastName);
    assert.equal(updatedUser?.email, updateUserData.email);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
    assert.equal(
      updatedUser?.name,
      updateUserData.firstName + ' ' + updateUserData.lastName,
    );
  });

  it('should fail when dont sending firstName and lastName', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.BOTH_FIRST_NAME_AND_LAST_NAME_CANT_BE_EMPTY,
    );
  });
  it('should fail when email is invalid', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: 'firstName',
      email: 'giveth',
      avatar: 'pinata address',
      url: 'website url',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(result.data.errors[0].message, errorMessages.INVALID_EMAIL);
  });
  it('should fail when email is invalid', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: 'firstName',
      email: 'giveth @ giveth.com',
      avatar: 'pinata address',
      url: 'website url',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(result.data.errors[0].message, errorMessages.INVALID_EMAIL);
  });
  it('should fail when sending empty string for firstName', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: '',
      lastName: 'test lastName',
      email: 'giveth @ giveth.com',
      avatar: 'pinata address',
      url: 'website url',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.FIRSTNAME_CANT_BE_EMPTY_STRING,
    );
  });
  it('should fail when sending empty string for lastName', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      lastName: '',
      firstName: 'firstName',
      email: 'giveth @ giveth.com',
      avatar: 'pinata address',
      url: 'website url',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.LASTNAME_CANT_BE_EMPTY_STRING,
    );
  });

  it('should update user and name of user when sending just lastName', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstName = 'firstName';
    user.firstName = firstName;
    user.name = firstName;
    await user.save();
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      lastName: new Date().getTime().toString(),
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.updateUser);
    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    assert.equal(updatedUser?.email, updateUserData.email);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
    assert.equal(updatedUser?.name, firstName + ' ' + updateUserData.lastName);
    assert.equal(updatedUser?.firstName, firstName);
  });

  it('should update user and name of user when sending just firstName', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const lastName = 'lastName';
    user.lastName = lastName;
    user.name = lastName;
    await user.save();
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      email: 'giveth@gievth.com',
      avatar: 'pinata address',
      url: 'website url',
      firstName: new Date().getTime().toString(),
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.updateUser);
    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    assert.equal(updatedUser?.email, updateUserData.email);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
    assert.equal(updatedUser?.name, updateUserData.firstName + ' ' + lastName);
    assert.equal(updatedUser?.lastName, lastName);
  });

  it('should accept empty string for all fields except email', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: 'test firstName',
      lastName: 'test lastName',
      avatar: '',
      url: '',
    };
    const result = await axios.post(
      graphqlUrl,
      {
        query: updateUser,
        variables: updateUserData,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    assert.isTrue(result.data.data.updateUser);
    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    assert.equal(updatedUser?.firstName, updateUserData.firstName);
    assert.equal(updatedUser?.lastName, updateUserData.lastName);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
  });
}
function sendUserEmailConfirmationCodeFlow(): void {
  it('should send the email', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);

    await axios.post(
      graphqlUrl,
      {
        query: sendCodeToConfirmEmail,
        variables: {
          email: user.email,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    assert.isNotNull(updatedUser?.verificationCode);
  });
  it('should fail send the email not logged in', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    try {
      await axios.post(graphqlUrl, {
        query: sendCodeToConfirmEmail,
        variables: {
          email: user.email,
        },
      });
    } catch (e) {
      assert.equal(
        e.response.data.errors[0].message,
        translationErrorMessagesKeys.AUTHENTICATION_REQUIRED,
      );
    }
  });
  it('should set the user verification false, user already has been verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.isEmailVerified = true;
    await user.save();
    const accessToken = await generateTestAccessToken(user.id);

    await axios.post(
      graphqlUrl,
      {
        query: sendCodeToConfirmEmail,
        variables: {
          email: 'newemail@test.com',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });

    assert.isNotNull(updatedUser?.verificationCode);
    assert.isFalse(updatedUser?.isEmailVerified);
    assert.equal(updatedUser?.email, 'newemail@test.com');
  });
  it('should fail send the email when email is already verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.isEmailVerified = true;
    await user.save();
    const accessToken = await generateTestAccessToken(user.id);

    try {
      await axios.post(
        graphqlUrl,
        {
          query: sendCodeToConfirmEmail,
          variables: {
            email: user.email,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (e) {
      assert.equal(
        e.response.data.errors[0].message,
        translationErrorMessagesKeys.EMAIL_ALREADY_USED,
      );
    }
  });
}

function verifyUserEmailCode() {
  it('should verify the email code', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    await axios.post(
      graphqlUrl,
      {
        query: sendCodeToConfirmEmail,
        variables: {
          email: user.email,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    await axios.post(
      graphqlUrl,
      {
        query: verifyUserEmailCodeQuery,
        variables: {
          code: updatedUser?.verificationCode,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const verifiedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });

    assert.isTrue(verifiedUser?.isEmailVerified);
  });
  it('should fail verify the email code not logged in', async () => {
    try {
      await axios.post(graphqlUrl, {
        query: verifyUserEmailCodeQuery,
        variables: {
          code: 1234,
        },
      });
    } catch (e) {
      assert.equal(
        e.response.data.errors[0].message,
        translationErrorMessagesKeys.AUTHENTICATION_REQUIRED,
      );
    }
  });
  it('should fail verify the email code when code is wrong', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);

    await axios.post(
      graphqlUrl,
      {
        query: sendCodeToConfirmEmail,
        variables: {
          email: user.email,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });

    assert.isNotNull(updatedUser?.verificationCode);

    if (!updatedUser?.verificationCode) return;

    try {
      await axios.post(
        graphqlUrl,
        {
          query: verifyUserEmailCodeQuery,
          variables: {
            code: updatedUser?.verificationCode + 1,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (e) {
      assert.equal(
        e.response.data.errors[0].message,
        translationErrorMessagesKeys.INVALID_EMAIL_CODE,
      );
    }
  });
}

function checkEmailAvailability() {
  it('should return true when email is available', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const email = 'test@gmail.com';

    const result = await axios.post(
      graphqlUrl,
      {
        query: checkEmailAvailabilityQuery,
        variables: {
          email,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.checkEmailAvailability);
  });

  it('should return false when email is not available', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const email = user.email;

    try {
      await axios.post(
        graphqlUrl,
        {
          query: checkEmailAvailabilityQuery,
          variables: {
            email,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
    } catch (e) {
      assert.equal(
        e.response.data.errors[0].message,
        translationErrorMessagesKeys.EMAIL_ALREADY_USED,
      );
    }
  });
}
