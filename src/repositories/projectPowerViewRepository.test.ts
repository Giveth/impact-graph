import { assert, expect } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../test/testUtils';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository';
import { setPowerRound } from './powerRoundRepository';
import {
  getTopPowerRank,
  getProjectPowers,
  refreshProjectPowerView,
  refreshProjectFuturePowerView,
  getProjectFuturePowers,
} from './projectPowerViewRepository';
import { Project } from '../entities/project';
import { getConnection } from 'typeorm';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import {
  findInCompletePowerSnapShots,
  insertSinglePowerBalanceSnapshot,
} from './powerSnapshotRepository';
import { PowerBoosting } from '../entities/powerBoosting';

describe(
  'projectPowerViewRepository test',
  projectPowerViewRepositoryTestCases,
);

describe(
  'projectFuturePowerViewRepository test',
  projectFuturePowerViewRepositoryTestCases,
);

describe('getTopPowerRank test cases', getTopPowerRankTestCases);

function projectPowerViewRepositoryTestCases() {
  beforeEach(async () => {
    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('should rank correctly, and include boosted and not boosted projects', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project1.id * 10;

    await insertSinglePowerBoosting({
      user,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user,
      project: project2,
      percentage: 20,
    });

    await takePowerBoostingSnapshot();
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();
    const projectPowers = await getProjectPowers(project3.id);
    const projectCount = await Project.count();
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, projectCount);
    assert.equal(projectPowers[0].powerRank, 1);
    assert.equal(projectPowers[0].projectId, project2.id);
    assert.equal(projectPowers[1].powerRank, 2);
    assert.equal(projectPowers[1].projectId, project1.id);
    assert.equal(projectPowers[2].powerRank, 3);
    assert.equal(projectPowers[3].powerRank, 3);
  });

  it('should set correct power amount', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const roundNumber = project1.id * 10;

    const user1Boosting = await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    const user2Boosting = await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 20,
    });

    await takePowerBoostingSnapshot();
    let incompleteSnapshots = await findInCompletePowerSnapShots();
    let snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });

    await insertSinglePowerBalanceSnapshot({
      userId: user2.id,
      powerSnapshotId: snapshot.id,
      balance: 20000,
    });

    await sleep(1);

    user1Boosting.percentage = 20;
    await user1Boosting.save();

    user2Boosting.percentage = 40;
    await user2Boosting.save();

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
      balance: 40000,
    });

    await setPowerRound(roundNumber);

    await refreshProjectPowerView();
    const projectPowers = await getProjectPowers(project1.id + 1);
    assert.isArray(projectPowers);

    const project1power = projectPowers.find(p => p.projectId === project1.id);

    assert.isDefined(project1power);

    // User1 power boosting = (10000 * 0.10 + 20000 * 0.20) / 2 = 2500
    // User2 power boosting = (20000 * 0.20 + 40000 * 0.40) / 2 = 10000
    expect(project1power?.totalPower).to.be.closeTo(10000 + 2500, 0.00001);
  });
}

function projectFuturePowerViewRepositoryTestCases() {
  beforeEach(async () => {
    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('should calculate future power rank correctly', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());
    const project4 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project1.id * 10;

    const boosting1 = await insertSinglePowerBoosting({
      user,
      project: project1,
      percentage: 10,
    });
    const boosting2 = await insertSinglePowerBoosting({
      user,
      project: project2,
      percentage: 20,
    });
    const boosting3 = await insertSinglePowerBoosting({
      user,
      project: project3,
      percentage: 30,
    });
    const boosting4 = await insertSinglePowerBoosting({
      user,
      project: project4,
      percentage: 40,
    });

    await takePowerBoostingSnapshot();
    let incompleteSnapshots = await findInCompletePowerSnapShots();
    let snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await setPowerRound(roundNumber);

    boosting1.percentage = 70;
    boosting2.percentage = 30;
    boosting3.percentage = 0;
    boosting4.percentage = 0;

    await PowerBoosting.save([boosting1, boosting2, boosting3, boosting4]);

    await takePowerBoostingSnapshot();
    incompleteSnapshots = await findInCompletePowerSnapShots();
    snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 2;
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await refreshProjectPowerView();
    await refreshProjectFuturePowerView();

    const projectPowers = await getProjectPowers(project4.id);
    const projectFuturePowers = await getProjectFuturePowers(project4.id);

    const projectCount = await Project.count();
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, projectCount);
    assert.equal(projectPowers[0].powerRank, 1);
    assert.equal(projectPowers[0].projectId, project4.id);
    assert.equal(projectPowers[1].powerRank, 2);
    assert.equal(projectPowers[1].projectId, project3.id);
    assert.equal(projectPowers[2].powerRank, 3);
    assert.equal(projectPowers[2].projectId, project2.id);
    assert.equal(projectPowers[3].powerRank, 4);
    assert.equal(projectPowers[3].projectId, project1.id);

    assert.equal(projectFuturePowers[0].powerRank, 1);
    assert.equal(projectFuturePowers[0].projectId, project1.id);
    assert.equal(projectFuturePowers[1].powerRank, 2);
    assert.equal(projectFuturePowers[1].projectId, project2.id);
    assert.equal(projectFuturePowers[2].powerRank, 3);
    assert.equal(projectFuturePowers[3].powerRank, 3);
  });
}

function getTopPowerRankTestCases() {
  beforeEach(async () => {
    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('Should return topPowerRank correctly', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    await saveProjectDirectlyToDb(createProjectData());
    await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project1.id * 10;

    await insertSinglePowerBoosting({
      user,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user,
      project: project2,
      percentage: 20,
    });

    await takePowerBoostingSnapshot();
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();

    const topPowerRank = await getTopPowerRank();
    assert.equal(topPowerRank, 3);
  });
}
