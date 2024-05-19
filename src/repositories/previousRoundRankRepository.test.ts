import { assert } from 'chai';
import {
  copyProjectRanksToPreviousRoundRankTable,
  deleteAllPreviousRoundRanks,
  projectsThatTheirRanksHaveChanged,
} from './previousRoundRankRepository';
import { AppDataSource } from '../orm';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  SEED_DATA,
  dbIndependentTests,
} from '../../test/testUtils';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository';
import { getPowerRound, setPowerRound } from './powerRoundRepository';
import {
  getProjectPowers,
  refreshProjectPowerView,
} from './projectPowerViewRepository';
import { Project } from '../entities/project';
import { PreviousRoundRank } from '../entities/previousRoundRank';
import { ProjectPowerView } from '../views/projectPowerView';
import { findProjectById } from './projectRepository';
import { PowerRound } from '../entities/powerRound';
import { addOrUpdatePowerSnapshotBalances } from './powerBalanceSnapshotRepository';
import { findPowerSnapshots } from './powerSnapshotRepository';

describe(
  'copyProjectRanksToPreviousRoundRankTable test cases',
  copyProjectRanksToPreviousRoundRankTableTestCases,
);
describe(
  'deleteAllPreviousRoundRanks test cases',
  deleteAllPreviousRoundRanksTestCases,
);
describe(
  'projectsThatTheirRanksHaveChanged test cases',
  projectsThatTheirRanksHaveChangedTestCases,
);

beforeEach(async function () {
  const { title } = this.currentTest?.parent || {};

  if (title && dbIndependentTests.includes(title)) {
    return;
  }

  await AppDataSource.getDataSource().query('TRUNCATE power_snapshot CASCADE');
  await PowerBalanceSnapshot.clear();
  await PowerBoostingSnapshot.clear();
  await PreviousRoundRank.clear();
  await PowerRound.clear();

  await createSomeSampleProjectsAndPowerViews();
});

const createSomeSampleProjectsAndPowerViews = async () => {
  const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  const project1 = await saveProjectDirectlyToDb(createProjectData());
  const project2 = await saveProjectDirectlyToDb(createProjectData());
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
};

function copyProjectRanksToPreviousRoundRankTableTestCases() {
  it('should copy projects rank in previous round rank table', async () => {
    const projectPowerViews = await getProjectPowers();
    await copyProjectRanksToPreviousRoundRankTable();
    const result = await PreviousRoundRank.find();
    for (const projectPowerView of projectPowerViews) {
      assert.equal(
        projectPowerView.powerRank,
        result.find(item => item.projectId === projectPowerView.projectId)
          ?.rank,
      );
    }
  });
}

function deleteAllPreviousRoundRanksTestCases() {
  it('should delete all previous round ranks', async () => {
    await copyProjectRanksToPreviousRoundRankTable();
    assert.notEqual(await PreviousRoundRank.count(), 0);
    await deleteAllPreviousRoundRanks();
    assert.equal(await PreviousRoundRank.count(), 0);
  });
}

function projectsThatTheirRanksHaveChangedTestCases() {
  it('should return projects that their ranks have changed', async () => {
    await copyProjectRanksToPreviousRoundRankTable();

    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await findProjectById(SEED_DATA.FIRST_PROJECT.id);
    await saveProjectDirectlyToDb(createProjectData());
    const roundNumber = ((await getPowerRound())?.round as number) + 1;

    await insertSinglePowerBoosting({
      user,
      project: project1,
      percentage: 50,
    });

    await insertSinglePowerBoosting({
      user,
      project: project2 as Project,
      percentage: 50,
    });

    await takePowerBoostingSnapshot();
    const [powerSnapshots] = await findPowerSnapshots();
    const snapshot = powerSnapshots[0];

    snapshot.blockNumber = roundNumber;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user.id,
      powerSnapshotId: snapshot.id,

      // Put so much balance on that to reorder lots of ranks
      balance: 1000000,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();
    const projectsHaveNewRankingInputParams =
      await projectsThatTheirRanksHaveChanged();

    for (const item of projectsHaveNewRankingInputParams) {
      const projectPowerView = await ProjectPowerView.findOne({
        where: { projectId: item.projectId },
      });
      const projectPreviousRank = await PreviousRoundRank.findOne({
        where: { projectId: item.projectId },
      });
      const project = await findProjectById(item.projectId);

      assert.equal(project?.verified, true);
      assert.notEqual(projectPowerView?.powerRank, projectPreviousRank?.rank);
      assert.equal(item.newRank, projectPowerView?.powerRank);
      assert.equal(item.oldRank, projectPreviousRank?.rank);
    }
  });
}
