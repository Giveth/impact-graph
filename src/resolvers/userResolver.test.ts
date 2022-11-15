// TODO Write test cases

import { User } from '../entities/user';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  generateTestAccessToken,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
} from '../../test/testUtils';
import axios from 'axios';
import { updateUser, userByAddress } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { errorMessages } from '../utils/errorMessages';
import { insertSinglePowerBoosting } from '../repositories/powerBoostingRepository';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { getConnection } from 'typeorm';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { PowerSnapshot } from '../entities/powerSnapshot';

describe('updateUser() test cases', updateUserTestCases);
describe('userByAddress() test cases', userByAddressTestCases);
// TODO I think we can delete  addUserVerification query
// describe('addUserVerification() test cases', addUserVerificationTestCases);

function userByAddressTestCases() {
  it('Get non-sensitive fields of a user including givPower and boostedProjects', async () => {
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
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user,
      project: firstProject,
      percentage: 10,
    });

    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();

    let powerSnapshotTime = user.id * 1000;

    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime++),
        blockNumber: 100,
      },
      {
        time: new Date(powerSnapshotTime++),
      },
    ]);
    await PowerSnapshot.save(powerSnapshots);

    const powerBalance = await PowerBalanceSnapshot.create({
      userId: user.id,
      powerSnapshot: powerSnapshots[0],
      balance: 10,
    }).save();

    // most recent snapshot will be retrieve
    const powerBalance2 = await PowerBalanceSnapshot.create({
      userId: user.id,
      powerSnapshot: powerSnapshots[1],
      balance: 100,
    }).save();

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

    // power boosting
    assert.equal(
      result.data.data.userByAddress.givPower,
      powerBalance2.balance,
    );
    assert.equal(result.data.data.userByAddress.boostedProjectsCount, 1);
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
