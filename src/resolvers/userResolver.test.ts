// TODO Write test cases

import axios from 'axios';
import { assert } from 'chai';
import sinon from 'sinon';
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
  acceptedTermsOfService,
  batchMintingEligibleUsers,
  batchMintingEligibleUsersV2,
  checkUserPrivadoVerifiedState,
  refreshUserScores,
  updateUser,
  userByAddress,
  userVerificationConfirmEmail,
  userVerificationSendEmailConfirmation,
  setSkipVerificationMutation,
} from '../../test/graphqlQueries';
import { errorMessages } from '../utils/errorMessages';
import { DONATION_STATUS } from '../entities/donation';
import { getGitcoinAdapter, privadoAdapter } from '../adapters/adaptersFactory';
import { updateUserTotalDonated } from '../services/userService';
import { getUserEmailConfirmationFields } from '../repositories/userRepository';
import { UserEmailVerification } from '../entities/userEmailVerification';
import { PrivadoAdapter } from '../adapters/privado/privadoAdapter';
import { UserKycType } from './userResolver';
import {
  GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE,
  GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE,
} from '../constants/gitcoin';

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
describe(
  'checkUserPrivadoVerfiedState() test cases',
  checkUserPrivadoVerfiedStateTestCases,
);

describe(
  'acceptedTermsOfService() test cases',
  acceptedTermsOfServicesTestCases,
);

describe(
  'batchMintingEligibleUsers() test cases',
  batchMintingEligibleUsersTestCases,
);
describe(
  'batchMintingEligibleV2Users() test cases',
  batchMintingEligibleUsersV2TestCases,
);

describe('setSkipVerification() test cases', setSkipVerificationTestCases);

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
      fullName: 'firstName lastName',
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
    assert.equal(updatedUser?.firstName, updateUserData.fullName.split(' ')[0]);
    assert.equal(updatedUser?.lastName, updateUserData.fullName.split(' ')[1]);
    assert.equal(updatedUser?.email, updateUserData.email);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
    assert.equal(updatedUser?.name, updateUserData.fullName);
  });
  it('should update user with sending all data and then call userByAddress query', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      fullName: 'firstName lastName',
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
    assert.equal(updatedUser?.firstName, updateUserData.fullName.split(' ')[0]);
    assert.equal(updatedUser?.lastName, updateUserData.fullName.split(' ')[1]);
    assert.equal(updatedUser?.email, updateUserData.email);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
    assert.equal(updatedUser?.name, updateUserData.fullName);
  });

  it('should fail when dont sending fullName', async () => {
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
      errorMessages.FULL_NAME_CAN_NOT_BE_EMPTY,
    );
  });
  it('should fail when email is invalid', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      fullName: 'fullName',
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
      fullName: 'fullName',
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
  it('should fail when sending empty string for fullName', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      fullName: '',
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
      errorMessages.FULL_NAME_CAN_NOT_BE_EMPTY,
    );
  });
  // it('should fail when sending empty string for lastName', async () => {
  //   const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  //   const accessToken = await generateTestAccessToken(user.id);
  //   const updateUserData = {
  //     lastName: '',
  //     firstName: 'firstName',
  //     email: 'giveth @ giveth.com',
  //     avatar: 'pinata address',
  //     url: 'website url',
  //   };
  //   const result = await axios.post(
  //     graphqlUrl,
  //     {
  //       query: updateUser,
  //       variables: updateUserData,
  //     },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //     },
  //   );
  //
  //   assert.equal(
  //     result.data.errors[0].message,
  //     errorMessages.LASTNAME_CANT_BE_EMPTY_STRING,
  //   );
  // });
  //
  // it('should update user and name of user when sending just lastName', async () => {
  //   const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  //   const firstName = 'firstName';
  //   user.firstName = firstName;
  //   user.name = firstName;
  //   await user.save();
  //   const accessToken = await generateTestAccessToken(user.id);
  //   const updateUserData = {
  //     email: 'giveth@gievth.com',
  //     avatar: 'pinata address',
  //     url: 'website url',
  //     lastName: new Date().getTime().toString(),
  //   };
  //   const result = await axios.post(
  //     graphqlUrl,
  //     {
  //       query: updateUser,
  //       variables: updateUserData,
  //     },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //     },
  //   );
  //
  //   assert.isTrue(result.data.data.updateUser);
  //   const updatedUser = await User.findOne({
  //     where: {
  //       id: user.id,
  //     },
  //   });
  //   assert.equal(updatedUser?.email, updateUserData.email);
  //   assert.equal(updatedUser?.avatar, updateUserData.avatar);
  //   assert.equal(updatedUser?.url, updateUserData.url);
  //   assert.equal(updatedUser?.name, firstName + ' ' + updateUserData.lastName);
  //   assert.equal(updatedUser?.firstName, firstName);
  // });
  //
  // it('should update user and name of user when sending just firstName', async () => {
  //   const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  //   const lastName = 'lastName';
  //   user.lastName = lastName;
  //   user.name = lastName;
  //   await user.save();
  //   const accessToken = await generateTestAccessToken(user.id);
  //   const updateUserData = {
  //     email: 'giveth@gievth.com',
  //     avatar: 'pinata address',
  //     url: 'website url',
  //     firstName: new Date().getTime().toString(),
  //   };
  //   const result = await axios.post(
  //     graphqlUrl,
  //     {
  //       query: updateUser,
  //       variables: updateUserData,
  //     },
  //     {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //       },
  //     },
  //   );
  //
  //   assert.isTrue(result.data.data.updateUser);
  //   const updatedUser = await User.findOne({
  //     where: {
  //       id: user.id,
  //     },
  //   });
  //   assert.equal(updatedUser?.email, updateUserData.email);
  //   assert.equal(updatedUser?.avatar, updateUserData.avatar);
  //   assert.equal(updatedUser?.url, updateUserData.url);
  //   assert.equal(updatedUser?.name, updateUserData.firstName + ' ' + lastName);
  //   assert.equal(updatedUser?.lastName, lastName);
  // });

  it('should accept empty string for all fields except email', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      fullName: 'firstName lastName',
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
    assert.equal(updatedUser?.firstName, updateUserData.fullName.split(' ')[0]);
    assert.equal(updatedUser?.lastName, updateUserData.fullName.split(' ')[1]);
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
      { userId: userID },
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

function checkUserPrivadoVerfiedStateTestCases() {
  afterEach(() => {
    sinon.restore();
  });
  it('should return true if user has request ID in privadoVerifiedRequestIds', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.privadoVerifiedRequestIds = [1, 2, 3];
    await user.save();

    const accessToken = await generateTestAccessToken(user.id);
    sinon.stub(PrivadoAdapter, 'privadoRequestId').get(() => 2);

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

    assert.isOk(result.data.data.userByAddress);
    assert.isTrue(result.data.data.userByAddress.privadoVerified);
  });

  it('should return false if the user does not has request privadoVerifiedRequestIds', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.privadoVerifiedRequestIds = [1, 2, 3];
    await user.save();

    const accessToken = await generateTestAccessToken(user.id);
    sinon.stub(PrivadoAdapter, 'privadoRequestId').get(() => 4);

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

    assert.isOk(result.data.data.userByAddress);
    assert.isFalse(result.data.data.userByAddress.privadoVerified);
  });

  it('should add request ID to privadoVerifiedRequestIds if user is verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.privadoVerifiedRequestIds = [1, 2, 3];
    await user.save();

    const accessToken = await generateTestAccessToken(user.id);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    sinon.stub(privadoAdapter, 'checkVerificationOnchain').resolves(true);
    sinon.stub(PrivadoAdapter, 'privadoRequestId').get(() => 4);

    const result = await axios.post(
      graphqlUrl,
      {
        query: checkUserPrivadoVerifiedState,
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.checkUserPrivadoVerifiedState);

    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });

    assert.isTrue(updatedUser?.privadoVerifiedRequestIds.includes(4));
  });

  it('should not add request ID to privadoVerifiedRequestIds if user is not verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.privadoVerifiedRequestIds = [1, 2, 3];
    await user.save();

    const accessToken = await generateTestAccessToken(user.id);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    sinon.stub(privadoAdapter, 'checkVerificationOnchain').resolves(false);
    sinon.stub(PrivadoAdapter, 'privadoRequestId').get(() => 4);

    const result = await axios.post(
      graphqlUrl,
      {
        query: checkUserPrivadoVerifiedState,
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isFalse(result.data.data.checkUserPrivadoVerifiedState);

    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });

    assert.isFalse(updatedUser?.privadoVerifiedRequestIds.includes(4));
  });

  it('should not change privadoVerifiedRequestIds if user is already verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const userVeriviedRequestIds = [1, 2, 3];
    user.privadoVerifiedRequestIds = userVeriviedRequestIds;
    await user.save();

    const accessToken = await generateTestAccessToken(user.id);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    sinon.stub(privadoAdapter, 'checkVerificationOnchain').resolves(true);
    sinon.stub(PrivadoAdapter, 'privadoRequestId').get(() => 2);

    const result = await axios.post(
      graphqlUrl,
      {
        query: checkUserPrivadoVerifiedState,
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.checkUserPrivadoVerifiedState);

    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });

    assert.isNotNull(updatedUser);
    assert.deepEqual(
      updatedUser?.privadoVerifiedRequestIds,
      userVeriviedRequestIds,
    );
  });
}

function acceptedTermsOfServicesTestCases() {
  it.skip("should return true and set user's accepted terms of service with privado approved", async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
    });

    const accessToken = await generateTestAccessToken(user.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: acceptedTermsOfService,
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result.data.data.acceptedTermsOfService);
    assert.isTrue(result.data.data.acceptedTermsOfService);

    const updatedUser = await User.findOne({
      where: { walletAddress: user.walletAddress },
    });
    assert.isTrue(updatedUser?.acceptedToS);
  });

  it.skip('should return false without privado approval', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: acceptedTermsOfService,
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isOk(result.data.data);
    assert.isFalse(result.data.data.acceptedTermsOfService);

    const updatedUser = await User.findOne({
      where: { walletAddress: user.walletAddress },
    });
    assert.isNotTrue(updatedUser?.acceptedToS);
  });

  it.skip('should not return true `acceptedToS` for users have not accepted terms of service on userByAddress query', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const fetchUserResponse = await axios.post(graphqlUrl, {
      query: userByAddress,
      variables: {
        address: user.walletAddress,
      },
    });

    assert.isOk(fetchUserResponse.data.data.userByAddress);
    assert.isNotTrue(fetchUserResponse.data.data.userByAddress.acceptedToS);
  });

  it.skip('should return true for users have accepted terms of service', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
    });
    const accessToken = await generateTestAccessToken(user.id);

    await axios.post(
      graphqlUrl,
      {
        query: acceptedTermsOfService,
      },
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const fetchUserResponse = await axios.post(graphqlUrl, {
      query: userByAddress,
      variables: {
        address: user.walletAddress,
      },
    });

    assert.isOk(fetchUserResponse.data.data.userByAddress);
    assert.isTrue(fetchUserResponse.data.data.userByAddress.acceptedToS);
  });
}

function batchMintingEligibleUsersTestCases() {
  const DAY = 86400000;
  beforeEach(async () => {
    // clear all users not empty accepted terms of service
    await User.delete({ acceptedToS: true });
  });
  it('should return users who have accepted terms of service and privado verified', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      acceptedToS: true,
      // 2 days ago
      acceptedToSDate: new Date(Date.now() - DAY * 3),
    });

    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      acceptedToS: true,
      // yesterday
      acceptedToSDate: new Date(Date.now() - DAY * 2),
    });

    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      acceptedToS: true,
      // yesterday
      acceptedToSDate: new Date(Date.now() - DAY),
    });

    const result = await axios.post(graphqlUrl, {
      query: batchMintingEligibleUsers,
    });

    assert.deepEqual(result.data.data.batchMintingEligibleUsers.users, [
      user1.walletAddress,
      user2.walletAddress,
      user3.walletAddress,
    ]);
  });
}

function batchMintingEligibleUsersV2TestCases() {
  const DAY = 86400000;
  beforeEach(async () => {
    // clear all users not empty accepted terms of service
    await User.delete({ acceptedToS: true });
  });

  it('should return empty array if there is no user to mint', async () => {
    const result = await axios.post(graphqlUrl, {
      query: batchMintingEligibleUsersV2,
    });

    assert.deepEqual(result.data.data.batchMintingEligibleUsersV2.users, []);
  });

  it('should return users who have accepted terms of service and has valid kyc status', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      acceptedToS: true,
      // 2 days ago
      acceptedToSDate: new Date(Date.now() - DAY * 3),
    });

    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      analysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE + 0.001,
      acceptedToS: true,
      // yesterday
      acceptedToSDate: new Date(Date.now() - DAY * 2),
    });

    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      passportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE + 0.001,
      acceptedToS: true,
      // yesterday
      acceptedToSDate: new Date(Date.now() - DAY),
    });

    const result = await axios.post(graphqlUrl, {
      query: batchMintingEligibleUsersV2,
    });

    assert.deepEqual(result.data.data.batchMintingEligibleUsersV2.users, [
      { address: user1.walletAddress, kycType: UserKycType.zkId },
      { address: user2.walletAddress, kycType: UserKycType.GTCPass },
      { address: user3.walletAddress, kycType: UserKycType.GTCPass },
    ]);
  });

  it('should not return users who have not accepted terms of service but have privado verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY),
    });

    await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
    });

    const result = await axios.post(graphqlUrl, {
      query: batchMintingEligibleUsersV2,
    });

    assert.deepEqual(result.data.data.batchMintingEligibleUsersV2.users, [
      { address: user.walletAddress, kycType: UserKycType.zkId },
    ]);
  });

  it('should not return users who have accepted terms of service but have not valid kyc status', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY),
    });

    await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId + 1],
      passportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE - 0.001,
      analysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE - 0.001,
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY),
    });

    const result = await axios.post(graphqlUrl, {
      query: batchMintingEligibleUsersV2,
    });

    assert.deepEqual(result.data.data.batchMintingEligibleUsersV2.users, [
      { address: user1.walletAddress, kycType: UserKycType.zkId },
    ]);
  });

  it('should implement pagination', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY * 3),
    });

    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      analysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE + 0.001,
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY * 2),
    });

    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      passportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE + 0.001,
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY),
    });

    let result = await axios.post(graphqlUrl, {
      query: batchMintingEligibleUsersV2,
      variables: {
        limit: 2,
        skip: 0,
      },
    });

    assert.deepEqual(result.data.data.batchMintingEligibleUsersV2.users, [
      { address: user1.walletAddress, kycType: UserKycType.zkId },
      { address: user2.walletAddress, kycType: UserKycType.GTCPass },
    ]);

    result = await axios.post(graphqlUrl, {
      query: batchMintingEligibleUsersV2,
      variables: {
        limit: 2,
        skip: 2,
      },
    });

    assert.deepEqual(result.data.data.batchMintingEligibleUsersV2.users, [
      { address: user3.walletAddress, kycType: UserKycType.GTCPass },
    ]);
  });

  it('should prioritize zkId over GTCPass', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      analysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE + 0.001,
      passportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE + 0.001,
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY * 4),
    });

    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      analysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE - 0.001,
      passportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE + 0.001,
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY * 3),
    });

    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId],
      analysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE + 0.001,
      passportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE - 0.001,
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY * 2),
    });

    const user4 = await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId + 1],
      analysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE + 0.001,
      passportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE + 0.001,
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY),
    });

    await saveUserDirectlyToDb(generateRandomEtheriumAddress(), {
      privadoVerifiedRequestIds: [PrivadoAdapter.privadoRequestId + 1],
      analysisScore: GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE - 0.001,
      passportScore: GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE - 0.001,
      acceptedToS: true,
      acceptedToSDate: new Date(Date.now() - DAY),
    });

    const result = await axios.post(graphqlUrl, {
      query: batchMintingEligibleUsersV2,
    });

    assert.deepEqual(result.data.data.batchMintingEligibleUsersV2.users, [
      { address: user1.walletAddress, kycType: UserKycType.zkId },
      { address: user2.walletAddress, kycType: UserKycType.zkId },
      { address: user3.walletAddress, kycType: UserKycType.zkId },
      { address: user4.walletAddress, kycType: UserKycType.GTCPass },
    ]);
  });
}

function setSkipVerificationTestCases() {
  it('should set skipVerification to true for authenticated user', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: setSkipVerificationMutation,
        variables: {
          skipVerification: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.setSkipVerification);

    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    assert.isTrue(updatedUser?.skipVerification);
  });

  it('should set skipVerification to false for authenticated user', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user.skipVerification = true;
    await user.save();
    const accessToken = await generateTestAccessToken(user.id);

    const result = await axios.post(
      graphqlUrl,
      {
        query: setSkipVerificationMutation,
        variables: {
          skipVerification: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.isTrue(result.data.data.setSkipVerification);

    const updatedUser = await User.findOne({
      where: {
        id: user.id,
      },
    });
    assert.isFalse(updatedUser?.skipVerification);
  });

  it('should throw error when user is not authenticated', async () => {
    const result = await axios.post(graphqlUrl, {
      query: setSkipVerificationMutation,
      variables: {
        skipVerification: true,
      },
    });

    assert.equal(
      result.data.errors[0].message,
      errorMessages.AUTHENTICATION_REQUIRED,
    );
  });

  it('should throw error when user is not found', async () => {
    const accessToken = await generateTestAccessToken(999999); // Non-existent user ID

    const result = await axios.post(
      graphqlUrl,
      {
        query: setSkipVerificationMutation,
        variables: {
          skipVerification: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(result.data.errors[0].message, errorMessages.USER_NOT_FOUND);
  });
}
