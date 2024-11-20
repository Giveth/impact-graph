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
  updateUser,
  userByAddress,
} from '../../test/graphqlQueries';
import { errorMessages } from '../utils/errorMessages';
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
describe('userEmailVerification() test cases', userEmailVerification);
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
      isFirstUpdate: true, // bypassing verification of email
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
      isFirstUpdate: true, // bypassing verification of email
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
  it('should fail when email is invalid first case', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: 'firstName',
      email: 'giveth',
      avatar: 'pinata address',
      url: 'website url',
      isFirstUpdate: true, // bypassing verification of email
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
  it('should fail when email is invalid second case', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: 'firstName',
      email: 'giveth @ giveth.com',
      avatar: 'pinata address',
      url: 'website url',
      isFirstUpdate: true, // bypassing verification of email
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
      isFirstUpdate: true, // bypassing verification of email
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
      isFirstUpdate: true, // bypassing verification of email
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
      isFirstUpdate: true, // bypassing verification of email
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
      isFirstUpdate: true, // bypassing verification of email
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
      isFirstUpdate: true, // bypassing verification of email
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

function userEmailVerification() {
  describe('userEmailVerification() test cases', () => {
    it('should send a verification code if the email is valid and not used by another user', async () => {
      // Create a user
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.isEmailVerified = false; // Ensure the email is not verified
      await user.save();

      // Update user email to match the expected test email
      const newEmail = `newemail-${generateRandomEtheriumAddress()}@giveth.io`;
      user.email = newEmail; // Update the email
      await user.save();

      const accessToken = await generateTestAccessToken(user.id);

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserEmailConfirmationCodeFlow($email: String!) {
              sendUserEmailConfirmationCodeFlow(email: $email)
            }
          `,
          variables: { email: newEmail },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the response
      assert.equal(
        result.data.data.sendUserEmailConfirmationCodeFlow,
        'VERIFICATION_SENT',
      );

      // Assert the user is updated in the database
      const updatedUser = await User.findOne({ where: { id: user.id } });
      assert.equal(updatedUser?.email, newEmail);
      assert.isNotNull(updatedUser?.emailVerificationCode);
    });

    it('should fail if the email is invalid', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const accessToken = await generateTestAccessToken(user.id);

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserEmailConfirmationCodeFlow($email: String!) {
              sendUserEmailConfirmationCodeFlow(email: $email)
            }
          `,
          variables: { email: 'invalid-email' },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the error
      assert.exists(result.data.errors);
      assert.equal(result.data.errors[0].message, errorMessages.INVALID_EMAIL);
    });

    it('should fail if the email is already verified', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.isEmailVerified = true; // Simulate an already verified email
      user.email = 'already-verified@giveth.io';
      await user.save();

      const accessToken = await generateTestAccessToken(user.id);

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserEmailConfirmationCodeFlow($email: String!) {
              sendUserEmailConfirmationCodeFlow(email: $email)
            }
          `,
          variables: { email: 'already-verified@giveth.io' },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the error
      assert.exists(result.data.errors);
      assert.equal(
        result.data.errors[0].message,
        errorMessages.USER_EMAIL_ALREADY_VERIFIED,
      );
    });

    it('should return EMAIL_EXIST if the email is already used by another user', async () => {
      const existingUser = await saveUserDirectlyToDb(
        generateRandomEtheriumAddress(),
      );
      existingUser.email = 'existing-user@giveth.io';
      existingUser.isEmailVerified = true;
      await existingUser.save();

      const newUser = await saveUserDirectlyToDb(
        generateRandomEtheriumAddress(),
      );
      const accessToken = await generateTestAccessToken(newUser.id);

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserEmailConfirmationCodeFlow($email: String!) {
              sendUserEmailConfirmationCodeFlow(email: $email)
            }
          `,
          variables: { email: 'existing-user@giveth.io' },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the response
      assert.equal(
        result.data.data.sendUserEmailConfirmationCodeFlow,
        'EMAIL_EXIST',
      );
    });
  });

  describe('sendUserConfirmationCodeFlow() test cases', () => {
    it('should successfully verify the email when provided with valid inputs', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.isEmailVerified = false; // Ensure email is not verified
      user.emailVerificationCode = '12345'; // Set a valid verification code
      await user.save();

      const accessToken = await generateTestAccessToken(user.id);
      const email = `verified-${generateRandomEtheriumAddress()}@giveth.io`;
      const verifyCode = '12345';

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserConfirmationCodeFlow($email: String!, $verifyCode: String!) {
              sendUserConfirmationCodeFlow(email: $email, verifyCode: $verifyCode)
            }
          `,
          variables: { email, verifyCode },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the response
      assert.equal(
        result.data.data.sendUserConfirmationCodeFlow,
        'VERIFICATION_SUCCESS',
      );

      // Verify the database state
      const updatedUser = await User.findOne({ where: { id: user.id } });
      assert.isTrue(updatedUser?.isEmailVerified);
      assert.isNull(updatedUser?.emailVerificationCode);
      assert.equal(updatedUser?.email, email);
    });

    it('should fail if the email format is invalid', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.isEmailVerified = false;
      user.emailVerificationCode = '12345';
      await user.save();

      const accessToken = await generateTestAccessToken(user.id);
      const email = 'invalid-email';
      const verifyCode = '12345';

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserConfirmationCodeFlow($email: String!, $verifyCode: String!) {
              sendUserConfirmationCodeFlow(email: $email, verifyCode: $verifyCode)
            }
          `,
          variables: { email, verifyCode },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the error
      assert.exists(result.data.errors);
      assert.equal(result.data.errors[0].message, errorMessages.INVALID_EMAIL);
    });

    it('should fail if the email is already verified', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.isEmailVerified = true;
      user.email = 'already-verified@giveth.io';
      user.emailVerificationCode = null; // No verification code
      await user.save();

      const accessToken = await generateTestAccessToken(user.id);

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserConfirmationCodeFlow($email: String!, $verifyCode: String!) {
              sendUserConfirmationCodeFlow(email: $email, verifyCode: $verifyCode)
            }
          `,
          variables: {
            email: 'already-verified@giveth.io',
            verifyCode: '12345',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the error
      assert.exists(result.data.errors);
      assert.equal(
        result.data.errors[0].message,
        errorMessages.USER_EMAIL_ALREADY_VERIFIED,
      );
    });

    it('should fail if no verification code is found', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.isEmailVerified = false;
      user.emailVerificationCode = null; // No verification code
      await user.save();

      const accessToken = await generateTestAccessToken(user.id);
      const email = `missing-code-${generateRandomEtheriumAddress()}@giveth.io`;

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserConfirmationCodeFlow($email: String!, $verifyCode: String!) {
              sendUserConfirmationCodeFlow(email: $email, verifyCode: $verifyCode)
            }
          `,
          variables: { email, verifyCode: '12345' },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the error
      assert.exists(result.data.errors);
      assert.equal(
        result.data.errors[0].message,
        errorMessages.USER_EMAIL_CODE_NOT_FOUND,
      );
    });

    it('should fail if the verification code does not match', async () => {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      user.isEmailVerified = false;
      user.emailVerificationCode = '54321'; // Incorrect code
      await user.save();

      const accessToken = await generateTestAccessToken(user.id);
      const email = `mismatch-${generateRandomEtheriumAddress()}@giveth.io`;
      const verifyCode = '12345'; // Incorrect code

      const result = await axios.post(
        graphqlUrl,
        {
          query: `
            mutation SendUserConfirmationCodeFlow($email: String!, $verifyCode: String!) {
              sendUserConfirmationCodeFlow(email: $email, verifyCode: $verifyCode)
            }
          `,
          variables: { email, verifyCode },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // Assert the error
      assert.exists(result.data.errors);
      assert.equal(
        result.data.errors[0].message,
        errorMessages.USER_EMAIL_CODE_NOT_MATCH,
      );
    });
  });
}
