import {
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import { getPowerAmountRankQuery } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { getConnection } from 'typeorm';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import {
  refreshProjectFuturePowerView,
  refreshProjectPowerView,
} from '../repositories/projectPowerViewRepository';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from '../repositories/powerBoostingRepository';
import {
  findInCompletePowerSnapShots,
  insertSinglePowerBalanceSnapshot,
} from '../repositories/powerSnapshotRepository';
import { setPowerRound } from '../repositories/powerRoundRepository';
import { PowerBoosting } from '../entities/powerBoosting';

describe('userProjectPowers test cases', projectPowersTestCases);

function projectPowersTestCases() {
  beforeEach(async () => {
    await getConnection().query('truncate power_snapshot cascade');
    await PowerBoosting.clear();
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('must return one where there is no project ranked', async () => {
    await refreshProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: getPowerAmountRankQuery,
      variables: { powerAmount: 100 },
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 1);
  });

  it('must return correct rank', async () => {
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
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
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

  it('must be round independent', async () => {
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
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber - 1;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
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

  it('must update by new snapshot data', async () => {
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
    let incompleteSnapshots = await findInCompletePowerSnapShots();
    let snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber - 1;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });
    await insertSinglePowerBalanceSnapshot({
      userId: user2.id,
      powerSnapshotId: snapshot.id,
      balance: 50000,
    });

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
    incompleteSnapshots = await findInCompletePowerSnapShots();
    snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 2;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 20000,
    });
    await insertSinglePowerBalanceSnapshot({
      userId: user2.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });

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
}
