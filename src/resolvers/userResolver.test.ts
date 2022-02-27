// TODO Write test cases
// describe('user() test cases', userTestCases);
// describe('userByAddress() test cases', userByAddressTestCases);
import { User } from '../entities/user';
import {
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import { updateUser } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { errorMessages } from '../utils/errorMessages';

describe('updateUser() test cases', updateUserTestCases);

// TODO I think we can delete  addUserVerification query
// describe('addUserVerification() test cases', addUserVerificationTestCases);

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

  it('should accept empty string for all fields', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const accessToken = await generateTestAccessToken(user.id);
    const updateUserData = {
      firstName: 'test firstName',
      lastName: '',
      email: '',
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
    assert.equal(updatedUser?.email, updateUserData.email);
    assert.equal(updatedUser?.avatar, updateUserData.avatar);
    assert.equal(updatedUser?.url, updateUserData.url);
    assert.equal(updatedUser?.name, updateUserData.firstName);
  });
}
