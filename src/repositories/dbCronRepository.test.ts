import { getConnection } from 'typeorm';
import {
  dropDbCronExtension,
  EVERY_MINUTE_CRON_JOB_EXPRESSION,
  EVERY_YEAR_CRON_JOB_EXPRESSION,
  getTakeSnapshotJobsAndCount,
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
import { insertSinglePowerBoosting } from './powerBoostingRepository';

describe('db cron job test', () => {
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
  it('should add and remove task', async () => {
    await dropDbCronExtension();
    await setupPgCronExtension();

    let [, count] = await getTakeSnapshotJobsAndCount();
    let jobs: CronJob[] = [];

    assert.equal(count, 0);
    await schedulePowerBoostingSnapshot(EVERY_YEAR_CRON_JOB_EXPRESSION);
    [jobs, count] = await getTakeSnapshotJobsAndCount();
    assert.equal(count, 1);
    assert.equal(jobs[0].jobName, POWER_BOOSTING_SNAPSHOT_TASK_NAME);
    assert.equal(jobs[0].schedule, EVERY_YEAR_CRON_JOB_EXPRESSION);
    await unSchedulePowerBoostingSnapshot();
    [jobs, count] = await getTakeSnapshotJobsAndCount();
    assert.equal(count, 0);
  });

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
    await sleep(60000);

    const snapshot = await PowerSnapshot.findOne({ order: { id: 'DESC' } });
    assert.isDefined(snapshot);

    const [powerBoostings, powerBoostingCounts] =
      await PowerBoosting.findAndCount({
        take: 4,
        select: ['id', 'projectId', 'userId', 'percentage'],
      });
    const [powerBoostingSnapshots, powerBoostingSnapshotsCounts] =
      await PowerBoostingSnapshot.findAndCount({
        where: { powerSnapshotId: snapshot?.id },
        take: 4,
      });

    assert.equal(powerBoostingCounts, powerBoostingSnapshotsCounts);
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
});
