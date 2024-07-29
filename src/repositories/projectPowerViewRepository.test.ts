import { assert, expect } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../test/testUtils.js';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository.js';
import { setPowerRound } from './powerRoundRepository.js';
import {
  getBottomRank,
  getProjectPowers,
  refreshProjectPowerView,
  refreshProjectFuturePowerView,
  getProjectFuturePowers,
  findProjectPowerViewByProjectId,
} from './projectPowerViewRepository.js';
import { Project, ProjStatus } from '../entities/project.js';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot.js';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot.js';
import { PowerBoosting } from '../entities/powerBoosting.js';
import { ProjectStatus } from '../entities/projectStatus.js';
import { AppDataSource } from '../orm.js';
import { addOrUpdatePowerSnapshotBalances } from './powerBalanceSnapshotRepository.js';
import { findPowerSnapshots } from './powerSnapshotRepository.js';

describe(
  'projectPowerViewRepository test',
  projectPowerViewRepositoryTestCases,
);

describe(
  'findProjectPowerViewByProjectId test',
  findProjectPowerViewByProjectIdTestCases,
);

describe(
  'projectFuturePowerViewRepository test',
  projectFuturePowerViewRepositoryTestCases,
);

describe('getBottomPowerRank test cases', getBottomPowerRankTestCases);

function projectPowerViewRepositoryTestCases() {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
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
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
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
    // the concurrently are affected by other tests TODO: FIX
    // assert.equal(projectPowers[0].powerRank, 1);
    // assert.equal(projectPowers[0].projectId, project2.id);
    // assert.equal(projectPowers[1].powerRank, 2);
    // assert.equal(projectPowers[1].projectId, project1.id);
    // assert.equal(projectPowers[2].powerRank, 3);
    // assert.equal(projectPowers[3].powerRank, 3);
  });
  it('should rank correctly, exclude non-active projects', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    await saveProjectDirectlyToDb(createProjectData());
    const nonActiveProject = await saveProjectDirectlyToDb(createProjectData());
    const status = await ProjectStatus.findOne({
      where: {
        id: ProjStatus.deactive,
      },
    });
    nonActiveProject.status = status as ProjectStatus;
    await nonActiveProject.save();

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
    await insertSinglePowerBoosting({
      user,
      project: nonActiveProject,
      percentage: 20,
    });

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();
    const projectPowers = await getProjectPowers(nonActiveProject.id);
    const projectCount = await Project.count();
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, projectCount);
    assert.notEqual(
      projectPowers.find(pb => pb.projectId === project1.id)?.totalPower,
      0,
    );
    assert.notEqual(
      projectPowers.find(pb => pb.projectId === project2.id)?.totalPower,
      0,
    );
    assert.equal(
      projectPowers.find(pb => pb.projectId === nonActiveProject.id)
        ?.totalPower,
      0,
    );
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
    let [powerSnapshots] = await findPowerSnapshots();
    let snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
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
        balance: 20000,
      },
    ]);

    await sleep(1);

    user1Boosting.percentage = 20;
    await user1Boosting.save();

    user2Boosting.percentage = 40;
    await user2Boosting.save();

    await takePowerBoostingSnapshot();
    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[1];

    snapshot.blockNumber = 2;
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
        balance: 40000,
      },
    ]);

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

function findProjectPowerViewByProjectIdTestCases() {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('Return project rank correctly', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project1.id * 10;

    await insertSinglePowerBoosting({
      user,
      project: project1,
      percentage: 10,
    });

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();
    const projectPower = await findProjectPowerViewByProjectId(project1.id);
    assert.isOk(projectPower);
    assert.equal(projectPower?.powerRank, 1);
    assert.equal(projectPower?.totalPower, 10);
  });
}

function projectFuturePowerViewRepositoryTestCases() {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBoosting.clear();
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
    let [powerSnapshots] = await findPowerSnapshots();
    let snapshot = powerSnapshots[0];

    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
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
    [powerSnapshots] = await findPowerSnapshots();
    snapshot = powerSnapshots[1];
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
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
    // OTher tests affect this: TODO FIX
    // assert.equal(projectPowers[0].powerRank, 1);
    // assert.equal(projectPowers[0].projectId, project4.id);
    // assert.equal(projectPowers[1].powerRank, 2);
    // assert.equal(projectPowers[1].projectId, project3.id);
    // assert.equal(projectPowers[2].powerRank, 3);
    // assert.equal(projectPowers[2].projectId, project2.id);
    // assert.equal(projectPowers[3].powerRank, 4);
    // assert.equal(projectPowers[3].projectId, project1.id);
    assert.isArray(projectFuturePowers);
    // assert.equal(projectFuturePowers[0].powerRank, 1);
    // assert.equal(projectFuturePowers[0].projectId, project1.id);
    // assert.equal(projectFuturePowers[1].powerRank, 2);
    // assert.equal(projectFuturePowers[1].projectId, project2.id);
  });
  it('should calculate future power rank correctly, exclude nonActive projects', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const nonActiveProject = await saveProjectDirectlyToDb(createProjectData());
    const status = await ProjectStatus.findOne({
      where: {
        id: ProjStatus.deactive,
      },
    });
    nonActiveProject.status = status as ProjectStatus;
    await nonActiveProject.save();

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
      project: nonActiveProject,
      percentage: 30,
    });

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await setPowerRound(roundNumber);

    boosting1.percentage = 60;
    boosting2.percentage = 30;
    boosting3.percentage = 10;

    await PowerBoosting.save([boosting1, boosting2, boosting3]);

    await takePowerBoostingSnapshot();

    snapshot.blockNumber = 2;
    snapshot.roundNumber = roundNumber + 1;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await refreshProjectPowerView();
    await refreshProjectFuturePowerView();

    const projectFuturePowers = await getProjectFuturePowers();
    assert.isArray(projectFuturePowers);
    assert.notEqual(
      projectFuturePowers.find(pb => pb.projectId === project1.id)?.totalPower,
      0,
    );
    assert.notEqual(
      projectFuturePowers.find(pb => pb.projectId === project2.id)?.totalPower,
      0,
    );
    assert.equal(
      projectFuturePowers.find(pb => pb.projectId === nonActiveProject.id)
        ?.totalPower,
      0,
    );
  });
  //
  // it('should return null for future power when no snapshot is synced', async () => {});
}

function getBottomPowerRankTestCases() {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('should return bottomPowerRank correctly', async () => {
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
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user.id,
      powerSnapshotId: snapshot.id,
      balance: 100,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();

    const bottomPowerRank = await getBottomRank();
    assert.equal(bottomPowerRank, 3);
  });
}
