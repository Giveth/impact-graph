// TODO Write test cases

import axios from 'axios';
import { assert } from 'chai';
import { User } from '../entities/user';
import {
  createDonationData,
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveDonationDirectlyToDb,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import {
  refreshUserScores,
  updateUser,
  userByAddress,
  userVerificationConfirmEmail,
  userVerificationSendEmailConfirmation,
} from '../../test/graphqlQueries';
import { errorMessages } from '../utils/errorMessages';
import { DONATION_STATUS } from '../entities/donation';
import { getGitcoinAdapter } from '../adapters/adaptersFactory';
import { updateUserTotalDonated } from '../services/userService';
import { getUserEmailConfirmationFields } from '../repositories/userRepository';
import { UserEmailVerification } from '../entities/userEmailVerification';

describe('updateUser() test cases', updateUserTestCases);
describe('userByAddress() test cases', userByAddressTestCases);
describe('refreshUserScores() test cases', refreshUserScoresTestCases);
describe(
  'userVerificationSendEmailConfirmation() test cases',
  userVerificationSendEmailConfirmationTestCases,
);
describe(
  'userVerificationConfirmEmail() test cases',
  userVerificationConfirmEmailTestCases,
);
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

function userVerificationSendEmailConfirmationTestCases() {
  it('should send email confirmation for user email verification', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.email = 'test@example.com';
    user.emailConfirmed = false;
    await user.save();

    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userVerificationSendEmailConfirmation,
        variables: {
          userId: user.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result.data.data.userVerificationSendEmailConfirmation);
    assert.isFalse(
      result.data.data.userVerificationSendEmailConfirmation.emailConfirmed,
    );
    assert.equal(
      result.data.data.userVerificationSendEmailConfirmation.email,
      'test@example.com',
    );
    assert.equal(
      result.data.data.userVerificationSendEmailConfirmation
        .emailConfirmationSent,
      true,
    );

    const emailConfirmationFields = await getUserEmailConfirmationFields(
      user.id,
    );
    assert.isNotNull(emailConfirmationFields);
    assert.equal(emailConfirmationFields?.emailVerificationCode?.length, 6);
    assert.isNotNull(emailConfirmationFields?.emailVerificationCodeExpiredAt);
  });

  it('should throw error when sending email confirmation if email is already confirmed', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.email = 'test@example.com';
    user.emailConfirmed = true;
    await user.save();

    const accessToken = await generateTestAccessToken(user.id);
    const result = await axios.post(
      graphqlUrl,
      {
        query: userVerificationSendEmailConfirmation,
        variables: {
          userId: user.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(
      result.data.errors[0].message,
      errorMessages.YOU_ALREADY_VERIFIED_THIS_EMAIL,
    );
  });
}

function userVerificationConfirmEmailTestCases() {
  it('should confirm user email verification', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.email = 'test@example.com';
    user.emailConfirmed = false;
    const userID = (await user.save()).id;

    const accessToken = await generateTestAccessToken(user.id);
    await axios.post(
      graphqlUrl,
      {
        query: userVerificationSendEmailConfirmation,
        variables: {
          userId: user.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const emailVerificationFields =
      await getUserEmailConfirmationFields(userID);
    const code = emailVerificationFields?.emailVerificationCode;

    const result = await axios.post(
      graphqlUrl,
      {
        query: userVerificationConfirmEmail,
        variables: {
          userId: user.id,
          emailConfirmationCode: code,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result.data.data.userVerificationConfirmEmail);
    assert.equal(
      result.data.data.userVerificationConfirmEmail.emailConfirmed,
      true,
    );
    assert.isNotNull(
      result.data.data.userVerificationConfirmEmail.emailConfirmedAt,
    );

    const updatedVerificationFields =
      await getUserEmailConfirmationFields(userID);
    assert.isNull(updatedVerificationFields?.emailVerificationCode);
    assert.isNull(updatedVerificationFields?.emailVerificationCodeExpiredAt);
  });

  it('should throw error when email confirmation code is incorrect for user email verification', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.email = 'test@example.com';
    user.emailConfirmed = false;
    await user.save();

    const accessToken = await generateTestAccessToken(user.id);
    await axios.post(
      graphqlUrl,
      {
        query: userVerificationSendEmailConfirmation,
        variables: {
          userId: user.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const incorrectCode = '123456'; // This code is incorrect

    const result = await axios.post(
      graphqlUrl,
      {
        query: userVerificationConfirmEmail,
        variables: {
          userId: user.id,
          emailConfirmationCode: incorrectCode,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(result.data.errors[0].message, errorMessages.INCORRECT_CODE);
  });

  it('should throw error when email confirmation code is expired for user email verification', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.email = 'test@example.com';
    user.emailConfirmed = false;
    const userID = (await user.save()).id;

    const accessToken = await generateTestAccessToken(user.id);
    await axios.post(
      graphqlUrl,
      {
        query: userVerificationSendEmailConfirmation,
        variables: {
          userId: user.id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    // Simulate expiration
    await UserEmailVerification.update(
      { user: { id: userID } },
      { emailVerificationCodeExpiredAt: new Date(Date.now() - 10000) },
    );

    const emailVerificationFields =
      await getUserEmailConfirmationFields(userID);
    const expiredCode = emailVerificationFields?.emailVerificationCode;

    const result = await axios.post(
      graphqlUrl,
      {
        query: userVerificationConfirmEmail,
        variables: {
          userId: user.id,
          emailConfirmationCode: expiredCode,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(result.data.errors[0].message, errorMessages.CODE_EXPIRED);
  });
}
