import { getConnection } from 'typeorm';
import {
  dropDbCronExtension,
  EVERY_MINUTE_CRON_JOB_EXPRESSION,
  EVERY_YEAR_CRON_JOB_EXPRESSION,
  getTakeSnapshotJobsAndCount,
  invokeGivPowerHistoricProcedures,
  POWER_BOOSTING_SNAPSHOT_TASK_NAME,
  schedulePowerBoostingSnapshot,
  setupPgCronExtension,
  unSchedulePowerBoostingSnapshot,
} from './dbCronRepository';
import { assert } from 'chai';
import config from '../config';
import { CronJob } from '../entities/CronJob';
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
import { getPowerRound, setPowerRound } from './powerRoundRepository';
import { PowerSnapshotHistory } from '../entities/powerSnapshotHistory';
import { PowerBoostingSnapshotHistory } from '../entities/powerBoostingSnapshotHistory';
import { insertSinglePowerBalanceSnapshot } from './powerSnapshotRepository';
import { PowerBalanceSnapshotHistory } from '../entities/powerBalanceSnapshotHistory';

describe(
  'db cron job historic procedures tests cases',
  givPowerHistoricTestCases,
);

function givPowerHistoricTestCases() {
  it('should move data older than 3 rounds to the historic tables', async () => {
    await getConnection().query('truncate power_snapshot cascade');
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

    const roundOneSnapshot = await PowerSnapshot.findOne();
    roundOneSnapshot!.roundNumber = 1;
    await roundOneSnapshot!.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: roundOneSnapshot!.id,
      balance: 20000,
    });

    assert.isDefined(roundOneSnapshot);

    // Round 5
    await setPowerRound(5);

    await takePowerBoostingSnapshot();

    const roundFiveSnapshot = await PowerSnapshot.findOne({
      id: roundOneSnapshot!.id + 1,
    });
    roundFiveSnapshot!.roundNumber = 5;
    await roundFiveSnapshot!.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: roundFiveSnapshot!.id,
      balance: 25000,
    });
    /// --- end round 5

    assert.isDefined(roundFiveSnapshot);

    await invokeGivPowerHistoricProcedures();

    const powerSnapshotHistory = await PowerSnapshotHistory.findOne();
    const powerBalanceHistory = await PowerBalanceSnapshotHistory.findOne();
    const powerBoostingSnapshotHistory =
      await PowerBoostingSnapshotHistory.findOne();

    assert.equal(
      powerSnapshotHistory!.roundNumber,
      roundOneSnapshot?.roundNumber,
    );
    assert.equal(powerBalanceHistory!.powerSnapshotId, roundOneSnapshot!.id);
    assert.equal(
      powerBoostingSnapshotHistory!.powerSnapshotId,
      roundOneSnapshot!.id,
    );
  });
}

describe('db cron job test', () => {
  beforeEach(async () => {
    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('should set up schedule on bootstrap', async () => {
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
    const EVERY_TEN_SECONDS_CRON_JOB_EXPRESSION = '*/10 * * * * *';

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
    const EVERY_TEN_SECONDS_CRON_JOB_EXPRESSION = '*/10 * * * * *';

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
