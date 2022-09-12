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
  it('should get list of userProjectPowers filter by projectId', async () => {
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
    assert.equal(
      result.data.data.userProjectPowers.userProjectPowers.length,
      2,
    );

    result.data.data.userProjectPowers.userProjectPowers.forEach(
      userProjectPower => {
        assert.equal(userProjectPower.project.id, firstProject.id);
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
        assert.equal(userProjectPower.project.id, firstProject.id);
        assert.equal(userProjectPower.user.id, firstUser.id);
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

  it('should get list of userProjectPowers filter by userId, sort by updatedAt DESC', async () => {
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
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        userId: firstUser.id,
        orderBy: {
          field: 'UpdatedAt',
          direction: 'DESC',
        },
      },
    });
    assert.isOk(result);
    const userProjectPowers =
      result.data.data.userProjectPowers.userProjectPowers;
    assert.equal(userProjectPowers.length, 3);
    assert.isTrue(
      userProjectPowers[0].updatedAt >= userProjectPowers[1].updatedAt,
    );
    assert.isTrue(
      userProjectPowers[1].updatedAt >= userProjectPowers[2].updatedAt,
    );
  });
  it('should get list of userProjectPowers filter by userId, sort by updatedAt ASC', async () => {
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
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        userId: firstUser.id,
        orderBy: {
          field: 'UpdatedAt',
          direction: 'ASC',
        },
      },
    });
    assert.isOk(result);
    const userProjectPowers =
      result.data.data.userProjectPowers.userProjectPowers;
    assert.equal(userProjectPowers.length, 3);
    assert.isTrue(
      userProjectPowers[0].updatedAt <= userProjectPowers[1].updatedAt,
    );
    assert.isTrue(
      userProjectPowers[1].updatedAt <= userProjectPowers[2].updatedAt,
    );
  });

  it('should get list of userProjectPowers filter by userId, sort by createdAt DESC', async () => {
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
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        userId: firstUser.id,
        orderBy: {
          field: 'CreationAt',
          direction: 'DESC',
        },
      },
    });
    assert.isOk(result);
    const userProjectPowers =
      result.data.data.userProjectPowers.userProjectPowers;
    assert.equal(userProjectPowers.length, 3);
    assert.isTrue(
      userProjectPowers[0].createdAt >= userProjectPowers[1].createdAt,
    );
    assert.isTrue(
      userProjectPowers[1].createdAt >= userProjectPowers[2].createdAt,
    );
  });
  it('should get list of userProjectPowers filter by userId, sort by createdAt ASC', async () => {
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
    const result = await axios.post(graphqlUrl, {
      query: getUserProjectPowerQuery,
      variables: {
        userId: firstUser.id,
        orderBy: {
          field: 'CreationAt',
          direction: 'ASC',
        },
      },
    });
    assert.isOk(result);
    const userProjectPowers =
      result.data.data.userProjectPowers.userProjectPowers;
    assert.equal(userProjectPowers.length, 3);
    assert.isTrue(
      userProjectPowers[0].createdAt <= userProjectPowers[1].createdAt,
    );
    assert.isTrue(
      userProjectPowers[1].createdAt <= userProjectPowers[2].createdAt,
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
  });
}
