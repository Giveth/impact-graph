import { assert } from 'chai';
import { AppDataSource } from '../orm';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository';
import { findPowerSnapshots } from './powerSnapshotRepository';
import { addOrUpdatePowerSnapshotBalances } from './powerBalanceSnapshotRepository';
import { setPowerRound } from './powerRoundRepository';
import {
  findProjectGivbackRankViewByProjectId,
  getBottomGivbackRank,
  refreshProjectGivbackRankView,
} from './projectGivbackViewRepository';

describe(
  'findProjectGivbackRankViewByProjectId test',
  findProjectGivbackRankViewByProjectIdTestCases,
);

describe('getBottomGivbackRank test cases', getBottomGivbackRankTestCases);

function getBottomGivbackRankTestCases() {
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
    await refreshProjectGivbackRankView();

    const bottomPowerRank = await getBottomGivbackRank();
    assert.equal(bottomPowerRank, 3);
  });
  it('should return bottomPowerRank correctly and not consider project that are not isGivbackEligible but are verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      isGivbackEligible: false,
      verified: true,
    });
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
    await refreshProjectGivbackRankView();

    const bottomPowerRank = await getBottomGivbackRank();
    assert.equal(bottomPowerRank, 2);
  });
}

function findProjectGivbackRankViewByProjectIdTestCases() {
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
    await refreshProjectGivbackRankView();
    const projectPower = await findProjectGivbackRankViewByProjectId(
      project1.id,
    );
    assert.isOk(projectPower);
    assert.equal(projectPower?.powerRank, 1);
    assert.equal(projectPower?.totalPower, 10);
  });
  it('Return project rank correctly and not consider project that are not isGivbackEligible but are verified', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      isGivbackEligible: false,
      verified: true,
    });

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
    await refreshProjectGivbackRankView();
    const projectPower = await findProjectGivbackRankViewByProjectId(
      project1.id,
    );
    assert.isOk(projectPower);
    assert.equal(projectPower?.powerRank, 1);
    assert.equal(projectPower?.totalPower, 0);
  });
}
