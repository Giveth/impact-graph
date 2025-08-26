import { assert } from 'chai';
import {
  dropDbCronExtension,
  EVERY_MINUTE_CRON_JOB_EXPRESSION,
  getTakeSnapshotJobsAndCount,
  invokeGivPowerHistoricProcedures,
  POWER_BOOSTING_SNAPSHOT_TASK_NAME,
  schedulePowerBoostingSnapshot,
  setupPgCronExtension,
  unSchedulePowerBoostingSnapshot,
} from './dbCronRepository';
import config from '../config';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../test/testUtils';
import { PowerSnapshot } from '../entities/powerSnapshot';
import { PowerBoosting } from '../entities/powerBoosting';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { setPowerRound } from './powerRoundRepository';
import { PowerSnapshotHistory } from '../entities/powerSnapshotHistory';
import { PowerBoostingSnapshotHistory } from '../entities/powerBoostingSnapshotHistory';
import { PowerBalanceSnapshotHistory } from '../entities/powerBalanceSnapshotHistory';
import { AppDataSource } from '../orm';
import { addOrUpdatePowerSnapshotBalances } from './powerBalanceSnapshotRepository';

describe(
  'db cron job historic procedures tests cases',
  givPowerHistoricTestCases,
);

function givPowerHistoricTestCases() {
  it.skip('should move data older than 1 round less to the historic tables', async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBoosting.clear();
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
    await PowerBoostingSnapshotHistory.clear();
    await PowerBalanceSnapshotHistory.clear();
    await PowerSnapshotHistory.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });

    // Round 1
    await setPowerRound(1);

    await takePowerBoostingSnapshot();

    const [roundOneSnapshot] = await PowerSnapshot.find({ take: 1 });
    roundOneSnapshot!.roundNumber = 1;
    await roundOneSnapshot!.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: roundOneSnapshot!.id,
      balance: 20000,
    });

    assert.isDefined(roundOneSnapshot);

    // Round 2
    await setPowerRound(3);

    await takePowerBoostingSnapshot();

    const roundTwoSnapshot = await PowerSnapshot.findOne({
      where: {
        id: roundOneSnapshot!.id + 1,
      },
    });
    roundTwoSnapshot!.roundNumber = 5;
    await roundTwoSnapshot!.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: roundTwoSnapshot!.id,
      balance: 25000,
    });

    // Round 3-----------------------------------
    await setPowerRound(3);

    await takePowerBoostingSnapshot();

    const roundThreeSnapshot = await PowerSnapshot.findOne({
      where: {
        id: roundTwoSnapshot!.id + 1,
      },
    });
    roundThreeSnapshot!.roundNumber = 5;
    await roundThreeSnapshot!.save();

    await addOrUpdatePowerSnapshotBalances({
      userId: user1.id,
      powerSnapshotId: roundThreeSnapshot!.id,
      balance: 25000,
    });
    /// --- end round 3-------------------------

    assert.isDefined(roundThreeSnapshot);

    await invokeGivPowerHistoricProcedures();

    const [powerSnapshots, powerSnapshotsCount] =
      await PowerSnapshot.createQueryBuilder().getManyAndCount();
    const [powerBalanceSnapshots, powerBalanceSnapshotsCount] =
      await PowerBalanceSnapshot.createQueryBuilder().getManyAndCount();
    const [powerBoostingSnapshots, powerBoostingSnapshotsCount] =
      await PowerBoostingSnapshot.createQueryBuilder().getManyAndCount();

    // Assert round 2 and 3 remain
    assert.equal(powerSnapshotsCount, 2);
    assert.equal(powerBalanceSnapshotsCount, 2);
    assert.equal(powerBoostingSnapshotsCount, 2);

    // Assert round 1 is not present in main tables
    for (const snapshot of powerSnapshots) {
      assert.notEqual(snapshot!.roundNumber, roundOneSnapshot?.roundNumber);
    }

    for (const balanceSnapshot of powerBalanceSnapshots) {
      assert.notEqual(balanceSnapshot!.powerSnapshotId, roundOneSnapshot!.id);
    }

    for (const boostingSnapshot of powerBoostingSnapshots) {
      assert.notEqual(boostingSnapshot!.powerSnapshotId, roundOneSnapshot!.id);
    }

    const [powerSnapshotHistory, powerSnapshotHistoryCount] =
      await PowerSnapshotHistory.createQueryBuilder().getManyAndCount();
    const [powerBalanceHistory, powerBalanceHistoryCount] =
      await PowerBalanceSnapshotHistory.createQueryBuilder().getManyAndCount();
    const [powerBoostingSnapshotHistory, powerBoostingSnapshotHistoryCount] =
      await PowerBoostingSnapshotHistory.createQueryBuilder().getManyAndCount();

    // only round 1 was inserted, while round 2 and 3 remain in main tables
    assert.equal(powerSnapshotHistoryCount, 1);
    assert.equal(powerBalanceHistoryCount, 1);
    assert.equal(powerBoostingSnapshotHistoryCount, 1);

    assert.equal(
      powerSnapshotHistory[0]!.roundNumber,
      roundOneSnapshot!.roundNumber,
    );
    assert.equal(powerBalanceHistory[0]!.powerSnapshotId, roundOneSnapshot!.id);
    assert.equal(powerBalanceHistory[0]!.balance, 20000);
    assert.equal(
      powerBoostingSnapshotHistory[0]!.powerSnapshotId,
      roundOneSnapshot!.id,
    );
  });
}

describe('db cron job test', () => {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it.skip('should set up schedule on bootstrap', async () => {
    const enableDbCronJob =
      config.get('ENABLE_DB_POWER_BOOSTING_SNAPSHOT') === 'true';
    if (enableDbCronJob) {
      const scheduleExpression = config.get(
        'DB_POWER_BOOSTING_SNAPSHOT_CRONJOB_EXPRESSION',
      ) as string;
      const [jobs, count] = await getTakeSnapshotJobsAndCount();
      assert.isAtLeast(count, 1);
      const job = jobs.find(
        j => j.jobName === POWER_BOOSTING_SNAPSHOT_TASK_NAME,
      );
      assert.isDefined(job);
      assert.equal(job?.schedule, scheduleExpression);
      await dropDbCronExtension();
    }
  });

  // TODO Should ask Amin what was the purpose of below test case because it doesnt work with other test cases

  // it('should add and remove task', async () => {
  //   await dropDbCronExtension();
  //   await setupPgCronExtension();
  //
  //   let [, count] = await getTakeSnapshotJobsAndCount();
  //   let jobs: CronJob[] = [];
  //
  //   assert.equal(count, 0);
  //   await schedulePowerBoostingSnapshot(EVERY_YEAR_CRON_JOB_EXPRESSION);
  //   [jobs, count] = await getTakeSnapshotJobsAndCount();
  //   assert.equal(count, 1);
  //   assert.equal(jobs[0].jobName, POWER_BOOSTING_SNAPSHOT_TASK_NAME);
  //   assert.equal(jobs[0].schedule, EVERY_YEAR_CRON_JOB_EXPRESSION);
  //   await unSchedulePowerBoostingSnapshot();
  //   [jobs, count] = await getTakeSnapshotJobsAndCount();
  //   assert.equal(count, 0);
  // });

  // This test takes one minutes to become complete, just will run it in special cases manually
  it.skip('should fill givpower boosting snapshot', async () => {
    await PowerBoosting.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project2,
      percentage: 30,
    });

    await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 30,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project2,
      percentage: 40,
    });
    await dropDbCronExtension();
    await setupPgCronExtension();

    await schedulePowerBoostingSnapshot(EVERY_MINUTE_CRON_JOB_EXPRESSION);

    // Wait for one minutes
    await sleep(60_000);

    const snapshot = await PowerSnapshot.findOne({ order: { id: 'DESC' } });
    assert.isDefined(snapshot);

    const [powerBoostings, powerBoostingCounts] =
      await PowerBoosting.findAndCount({
        select: ['id', 'projectId', 'userId', 'percentage'],
      });
    const [powerBoostingSnapshots, powerBoostingSnapshotsCounts] =
      await PowerBoostingSnapshot.findAndCount({
        where: { powerSnapshotId: snapshot?.id },
      });

    assert.equal(powerBoostingSnapshotsCounts, powerBoostingCounts);
    powerBoostings.forEach(pb => {
      const pbs = powerBoostingSnapshots.find(
        p =>
          p.projectId === pb.projectId &&
          p.userId === pb.userId &&
          p.percentage === pb.percentage &&
          p.powerSnapshotId === snapshot?.id,
      );
      assert.isDefined(pbs);
    });

    await unSchedulePowerBoostingSnapshot();
  });

  // This test takes one minutes to become complete, just will run it in special cases manually
  it.skip('should fill givpower boosting snapshot, not include non-verified project power boostings', async () => {
    await PowerBoosting.clear();

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb({
      ...createProjectData(),
      verified: false,
    });

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project2,
      percentage: 30,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project3,
      percentage: 20,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 30,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project2,
      percentage: 40,
    });
    await dropDbCronExtension();
    await setupPgCronExtension();

    await schedulePowerBoostingSnapshot(EVERY_MINUTE_CRON_JOB_EXPRESSION);

    // Wait for one minutes
    await sleep(60_000);

    const snapshot = await PowerSnapshot.findOne({ order: { id: 'DESC' } });
    assert.isDefined(snapshot);

    const powerBoostingSnapshotsCounts = await PowerBoostingSnapshot.count({
      where: { powerSnapshotId: snapshot?.id },
    });

    // There is 5 power boosting but one of them is for a non verified project
    assert.equal(powerBoostingSnapshotsCounts, 4);

    await unSchedulePowerBoostingSnapshot();
  });
});
