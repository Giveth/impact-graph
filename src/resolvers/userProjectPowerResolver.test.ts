import axios from 'axios';
import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils.js';
import { getUserProjectPowerQuery } from '../../test/graphqlQueries.js';
import { errorMessages } from '../utils/errorMessages.js';
import { setPowerRound } from '../repositories/powerRoundRepository.js';
import { refreshUserProjectPowerView } from '../repositories/userProjectPowerViewRepository.js';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from '../repositories/powerBoostingRepository.js';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot.js';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot.js';
import { AppDataSource } from '../orm.js';
import { addOrUpdatePowerSnapshotBalances } from '../repositories/powerBalanceSnapshotRepository.js';
import { findPowerSnapshots } from '../repositories/powerSnapshotRepository.js';

describe('userProjectPowers test cases', userProjectPowersTestCases);

function userProjectPowersTestCases() {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

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

    const givbackRound = secondProject.id * 10;

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

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = givbackRound;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: firstUser.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
      {
        userId: secondUser.id,
        powerSnapshotId: snapshot.id,
        balance: 20000,
      },
    ]);

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
    const givbackRound = secondProject.id * 10;

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = givbackRound;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: firstUser.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
      {
        userId: secondUser.id,
        powerSnapshotId: snapshot.id,
        balance: 20000,
      },
    ]);

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

    const givbackRound = secondProject.id * 10;

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = givbackRound;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: firstUser.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
      {
        userId: secondUser.id,
        powerSnapshotId: snapshot.id,
        balance: 20000,
      },
      {
        userId: thirdUser.id,
        powerSnapshotId: snapshot.id,
        balance: 30000,
      },
    ]);

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

    const givbackRound = secondProject.id * 10;

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = givbackRound;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: firstUser.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
      {
        userId: secondUser.id,
        powerSnapshotId: snapshot.id,
        balance: 20000,
      },
    ]);

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

    const givbackRound = secondProject.id * 10;

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = givbackRound;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: firstUser.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
      {
        userId: secondUser.id,
        powerSnapshotId: snapshot.id,
        balance: 20000,
      },
    ]);

    await setPowerRound(givbackRound);
    await refreshUserProjectPowerView();

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
}
