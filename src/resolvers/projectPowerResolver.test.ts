import axios from 'axios';
import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils.js';
import { getPowerAmountRankQuery } from '../../test/graphqlQueries.js';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot.js';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot.js';
import {
  refreshProjectFuturePowerView,
  refreshProjectPowerView,
} from '../repositories/projectPowerViewRepository.js';
import { User } from '../entities/user.js';
import { Project } from '../entities/project.js';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from '../repositories/powerBoostingRepository.js';
import { setPowerRound } from '../repositories/powerRoundRepository.js';
import { PowerBoosting } from '../entities/powerBoosting.js';
import { AppDataSource } from '../orm.js';
import { addOrUpdatePowerSnapshotBalances } from '../repositories/powerBalanceSnapshotRepository.js';
import { findPowerSnapshots } from '../repositories/powerSnapshotRepository.js';

describe('userProjectPowers test cases', projectPowersTestCases);

function projectPowersTestCases() {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBoosting.clear();
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('should return one where there is no project ranked', async () => {
    await refreshProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 100 },
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 1);
  });

  it('should return correct rank', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project3.id * 10;

    await Promise.all(
      [
        [user1, project1, 10], // 1000
        [user1, project2, 20], // 2000
        [user1, project3, 30], // 3000
      ].map(item => {
        const [user, project, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project,
          percentage,
        });
      }),
    );

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });

    await setPowerRound(roundNumber - 1);
    await refreshProjectFuturePowerView();

    // 1. Higher than all -> must return 1
    let result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 4000 },
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 1);

    // 2. Between some, must return correct rank
    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 1500 }, // 3000, 2000, [1500], 1000
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 3);

    // 2. Lower than all
    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 900 }, // 3000, 2000, 1000, [900]
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 4);
  });

  it('should be round independent', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project3.id * 10;

    await Promise.all(
      [
        [user1, project1, 10], // 1000
        [user1, project2, 20], // 2000
        [user1, project3, 30], // 3000
      ].map(item => {
        const [user, project, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project,
          percentage,
        });
      }),
    );

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber - 1;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });

    await setPowerRound(roundNumber - 1);
    await refreshProjectFuturePowerView();

    let result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 1500 }, // 3000, 2000, [1500], 1000
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 3);

    // Move to the next round
    await setPowerRound(roundNumber);
    await refreshProjectFuturePowerView();

    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 1500 }, // 3000, 2000, [1500], 1000
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 3);
  });

  it('should update by new snapshot data', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project3.id * 10;

    const powerBoostings = await Promise.all(
      [
        [user1, project1, 10],
        [user1, project2, 20],
        [user1, project3, 30],
        [user2, project1, 30],
        [user2, project2, 20],
        [user2, project3, 10],
      ].map(item => {
        const [user, project, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project,
          percentage,
        });
      }),
    );

    await takePowerBoostingSnapshot();
    let [powerSnapshots] = await findPowerSnapshots();
    let snapshot = powerSnapshots[0];

    snapshot.roundNumber = roundNumber - 1;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: user1.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
      {
        userId: user2.id,
        powerSnapshotId: snapshot.id,
        balance: 50000,
      },
    ]);

    await setPowerRound(roundNumber - 1);
    await refreshProjectFuturePowerView();

    // Project1: 1_000 + 15_000 = 16_000
    // Project2: 2_000 + 10_000 = 10_000
    // Project3: 3_000 + 5_000 = 8_000

    let result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 9000 }, // 16000, 10000, [9000], 8000
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 3);

    // Next snapshot

    powerBoostings[0].percentage = 40; // user 1 project 1
    powerBoostings[1].percentage = 30; // user 1 project 2
    powerBoostings[2].percentage = 20; // user 1 project 3
    powerBoostings[3].percentage = 10; // user 2 project 1
    powerBoostings[4].percentage = 20; // user 2 project 2
    powerBoostings[5].percentage = 30; // user 2 project 2

    await PowerBoosting.save(powerBoostings);

    await takePowerBoostingSnapshot();
    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[1];
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances([
      {
        userId: user1.id,
        powerSnapshotId: snapshot.id,
        balance: 20000,
      },
      {
        userId: user2.id,
        powerSnapshotId: snapshot.id,
        balance: 10000,
      },
    ]);

    // Project1: 8000 + 1000 = 9_000
    // Project2: 6000 + 2000 = 8_000
    // Project2: 4000 + 3000 = 7_000
    await refreshProjectFuturePowerView();

    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 9001 },
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 1);

    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 8999 },
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 2);
  });

  it('should return correct rank, when projectId is passed', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project3.id * 10;

    const boostings = await Promise.all(
      [
        [user1, project1, 10], // 1000
        [user1, project2, 20], // 2000
        [user1, project3, 30], // 3000
      ].map(item => {
        const [user, project, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project,
          percentage,
        });
      }),
    );

    await takePowerBoostingSnapshot();
    let [powerSnapshots] = await findPowerSnapshots();
    let snapshot = powerSnapshots[0];

    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });

    await setPowerRound(roundNumber - 1);
    await refreshProjectFuturePowerView();

    // project3 power is 3000
    // Querying 2999 (lower than rank 1 power) power with passing project3 id
    let result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 2999, projectId: project3.id },
    });
    assert.equal(result.data.data.powerAmountRank, 1);

    // Querying 2999 power without passing project3 id
    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 2999 },
    });
    assert.equal(result.data.data.powerAmountRank, 2);

    // Querying 2000 (rank 2 power) power with passing project3 id
    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 2000, projectId: project3.id },
    });
    assert.equal(result.data.data.powerAmountRank, 1);

    // Querying 2000 (rank 2 power) power with passing project2 id (rank 2)
    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 2000, projectId: project2.id }, // 3000, 2000, [1500], 1000
    });
    assert.equal(result.data.data.powerAmountRank, 2);

    // Two projects with same rank
    boostings[0].percentage = 20; // Project 1 -> 20% = 2000
    boostings[1].percentage = 20; // Project 2 -> 20% = 2000
    boostings[2].percentage = 40; // Project 3 -> 40% = 4000
    await PowerBoosting.save(boostings);

    await takePowerBoostingSnapshot();

    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[1];
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });

    await setPowerRound(roundNumber - 1);
    await refreshProjectFuturePowerView();

    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 2000, projectId: project2.id },
    });

    assert.equal(result.data.data.powerAmountRank, 2);

    result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 1999, projectId: project2.id },
    });

    assert.equal(result.data.data.powerAmountRank, 3);
  });
}
