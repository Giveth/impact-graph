// TODO Write test cases

import { User } from '../entities/user';
import {
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import { updateUser, userByAddress, userById } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { errorMessages } from '../utils/errorMessages';

describe('updateUser() test cases', updateUserTestCases);
describe('user() test cases', userTestCases);
describe('userByAddress() test cases', userByAddressTestCases);
// TODO I think we can delete  addUserVerification query
// describe('addUserVerification() test cases', addUserVerificationTestCases);

function userTestCases() {
  it('should return userInfo successfully with id', async () => {
    const userData = {
      firstName: 'firstName',
      lastName: 'lastName',
      email: `${new Date().getTime()}-giveth@gievth.com`,
      avatar: 'pinata address',
      url: 'website url',
      loginType: 'wallet',
      walletAddress: generateRandomEtheriumAddress(),
    };
    const user = await User.create(userData).save();
    const result = await axios.post(graphqlUrl, {
      query: userById,
      variables: {
        userId: user.id,
      },
    });
    assert.isOk(result.data.data.user);
    assert.equal(result.data.data.user.id, user.id);
    assert.equal(result.data.data.user.email, user.email);
  });

  it('should return null if user doesnt exist', async () => {
    const usersCount = await User.count();
    const result = await axios.post(graphqlUrl, {
      query: userById,
      variables: {
        userId: usersCount + 1000000,
      },
    });
    assert.isNull(result.data.data.user);
  });
}

function userByAddressTestCases() {
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
    assert.equal(result.data.data.userByAddress.email, userData.email);
    assert.equal(result.data.data.userByAddress.url, userData.url);
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
      id: user.id,
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
      id: user.id,
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

    const userByAddressResult = await axios.post(graphqlUrl, {
      query: userByAddress,
      variables: {
        address: user.walletAddress,
      },
    });
    assert.equal(
      userByAddressResult.data.data.userByAddress.avatar,
      updateUserData.avatar,
    );
    assert.equal(
      userByAddressResult.data.data.userByAddress.firstName,
      updateUserData.firstName,
    );
    assert.equal(
      userByAddressResult.data.data.userByAddress.lastName,
      updateUserData.lastName,
    );
    assert.equal(
      userByAddressResult.data.data.userByAddress.url,
      updateUserData.url,
    );
    assert.equal(
      userByAddressResult.data.data.userByAddress.email,
      updateUserData.email,
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
      id: user.id,
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
      id: user.id,
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
      id: user.id,
    });
    assert.equal(updatedUser?.firstName, updateUserData.firstName);
    assert.equal(updatedUser?.lastName, updateUserData.lastName);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
  });
}
