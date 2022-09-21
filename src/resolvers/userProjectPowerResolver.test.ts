import {
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import { getUserProjectPowerQuery } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { errorMessages } from '../utils/errorMessages';
import { insertNewUserPowers } from '../repositories/userPowerRepository';
import { setPowerRound } from '../repositories/powerRoundRepository';
import { refreshUserProjectPowerView } from '../repositories/userProjectPowerViewRepository';
import { insertSinglePowerBoosting } from '../repositories/powerBoostingRepository';

describe('userProjectPowers test cases', userProjectPowersTestCases);

function userProjectPowersTestCases() {
  it('should get error when the user doesnt send nether projectId nor userId', async () => {
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {},
    });

    assert.isOk(result);
    assert.equal(
      result.data.errors[0].message,
      errorMessages.SHOULD_SEND_AT_LEAST_ONE_OF_PROJECT_ID_AND_USER_ID,
    );
  });
  it('should get list of userProjectPowers filter by userId', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: firstProject,
      percentage: 3,
    });
    const givbackRound = 3;
    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound,
      users: [firstUser, secondUser],
      averagePowers: {
        [firstUser.walletAddress as string]: 10000,
        [secondUser.walletAddress as string]: 20000,
      },
    });
    await setPowerRound(givbackRound);
    await refreshUserProjectPowerView();

    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        userId: firstUser.id,
      },
    });
    assert.isOk(result);
    assert.equal(
      result.data.data.userProjectPowers.userProjectPowers.length,
      2,
    );
    result.data.data.userProjectPowers.userProjectPowers.forEach(
      userProjectPower => {
        assert.equal(userProjectPower.userId, firstUser.id);
      },
    );
  });
  it('should have name of users within the response', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: firstProject,
      percentage: 3,
    });
    const givbackRound = 3;
    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound,
      users: [firstUser, secondUser],
      averagePowers: {
        [firstUser.walletAddress as string]: 10000,
        [secondUser.walletAddress as string]: 20000,
      },
    });
    await setPowerRound(givbackRound);
    await refreshUserProjectPowerView();

    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        userId: firstUser.id,
      },
    });
    assert.isOk(result);
    assert.equal(
      result.data.data.userProjectPowers.userProjectPowers.length,
      2,
    );
    result.data.data.userProjectPowers.userProjectPowers.forEach(
      userProjectPower => {
        assert.equal(userProjectPower.userId, firstUser.id);
        assert.exists(userProjectPower.user.firstName);
      },
    );
  });
  it('should get list of userProjectPowers filter by projectId', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const thirdUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: firstProject,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: secondProject,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: thirdUser,
      project: firstProject,
      percentage: 13,
    });
    await insertSinglePowerBoosting({
      user: thirdUser,
      project: secondProject,
      percentage: 70,
    });

    const givbackRound = 3;
    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound,
      users: [firstUser, secondUser, thirdUser],
      averagePowers: {
        [firstUser.walletAddress as string]: 10000,
        [secondUser.walletAddress as string]: 20000,
        [thirdUser.walletAddress as string]: 30000,
      },
    });
    await setPowerRound(givbackRound);
    await refreshUserProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        projectId: firstProject.id,
      },
    });
    assert.isOk(result);
    assert.equal(
      result.data.data.userProjectPowers.userProjectPowers.length,
      3,
    );
    let lastBoostedPower =
      result.data.data.userProjectPowers.userProjectPowers[0].boostedPower;
    result.data.data.userProjectPowers.userProjectPowers.forEach(
      (userProjectPower, index) => {
        assert.equal(userProjectPower.projectId, firstProject.id);
        assert.equal(userProjectPower.rank, index + 1);
        assert.isTrue(userProjectPower.boostedPower <= lastBoostedPower);
        lastBoostedPower = userProjectPower.boostedPower;
      },
    );
  });
  it('should get list of userProjectPowers filter by projectId and userId', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: firstProject,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: secondProject,
      percentage: 3,
    });

    const givbackRound = 3;
    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound,
      users: [firstUser, secondUser],
      averagePowers: {
        [firstUser.walletAddress as string]: 10000,
        [secondUser.walletAddress as string]: 20000,
      },
    });
    await setPowerRound(givbackRound);
    await refreshUserProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        projectId: firstProject.id,
        userId: firstUser.id,
      },
    });
    assert.isOk(result);
    assert.equal(
      result.data.data.userProjectPowers.userProjectPowers.length,
      1,
    );

    result.data.data.userProjectPowers.userProjectPowers.forEach(
      userProjectPower => {
        assert.equal(userProjectPower.projectId, firstProject.id);
        assert.equal(userProjectPower.userId, firstUser.id);
      },
    );
  });
  it('should get list of userProjectPowers filter by projectId and userId, should not send user email in response', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: firstProject,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: secondProject,
      percentage: 3,
    });
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        projectId: firstProject.id,
      },
    });
    assert.isOk(result);
    result.data.data.userProjectPowers.userProjectPowers.forEach(
      userProjectPower => {
        assert.isNotOk(userProjectPower.user.email);
      },
    );
  });

  it('should get list of userProjectPowers filter by userId, sort by percentage DESC', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const thirdProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: thirdProject,
      percentage: 3,
    });
    const givbackRound = 3;
    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound,
      users: [firstUser],
      averagePowers: {
        [firstUser.walletAddress as string]: 10000,
      },
    });
    await setPowerRound(givbackRound);
    await refreshUserProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        userId: firstUser.id,
        orderBy: {
          field: 'Percentage',
          direction: 'DESC',
        },
      },
    });
    assert.isOk(result);
    const userProjectPowers =
      result.data.data.userProjectPowers.userProjectPowers;
    assert.equal(userProjectPowers.length, 3);
    assert.isTrue(
      userProjectPowers[0].percentage >= userProjectPowers[1].percentage,
    );
    assert.isTrue(
      userProjectPowers[1].percentage >= userProjectPowers[2].percentage,
    );
    assert.equal(userProjectPowers[0].rank, 1);
    assert.equal(userProjectPowers[1].rank, 2);
    assert.equal(userProjectPowers[2].rank, 3);
  });
  it('should get list of userProjectPowers filter by userId, sort by percentage ASC', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const thirdProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: thirdProject,
      percentage: 3,
    });
    const givbackRound = 3;
    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound,
      users: [firstUser],
      averagePowers: {
        [firstUser.walletAddress as string]: 10000,
      },
    });
    await setPowerRound(givbackRound);
    await refreshUserProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        userId: firstUser.id,
        orderBy: {
          field: 'Percentage',
          direction: 'ASC',
        },
      },
    });
    assert.isOk(result);
    const userProjectPowers =
      result.data.data.userProjectPowers.userProjectPowers;
    assert.equal(userProjectPowers.length, 3);
    assert.isTrue(
      userProjectPowers[0].percentage <= userProjectPowers[1].percentage,
    );
    assert.isTrue(
      userProjectPowers[1].percentage <= userProjectPowers[2].percentage,
    );
    assert.equal(userProjectPowers[0].rank, 3);
    assert.equal(userProjectPowers[1].rank, 2);
    assert.equal(userProjectPowers[2].rank, 1);
  });
}
