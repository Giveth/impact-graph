import {
  addFillPowerSnapshotBalanceJobsToQueue,
  processFillPowerSnapshotJobs,
} from './fillSnapshotBalances';
import { getPowerBoostingSnapshotWithoutBalance } from '../../repositories/powerSnapshotRepository';
import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../../test/testUtils';
import { PowerSnapshot } from '../../entities/powerSnapshot';
import { PowerBoostingSnapshot } from '../../entities/powerBoostingSnapshot';
import { AppDataSource } from '../../orm';
import { PowerBalanceSnapshot } from '../../entities/powerBalanceSnapshot';
import { logger } from '../../utils/logger';

describe(
  'processFillPowerSnapshotJobs test cases',
  processFillPowerSnapshotJobsTestCases,
);

async function processFillPowerSnapshotJobsTestCases() {
  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  before(async () => {
    await processFillPowerSnapshotJobs();
  });

  // it('should fill snapShotBalances for powerSnapshots', async () => {
  //   const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  //   const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
  //   const project1 = await saveProjectDirectlyToDb(createProjectData());
  //   let powerSnapshotTime = user1.id * 1000;
  //   const powerSnapshots = PowerSnapshot.create([
  //     {
  //       time: new Date(powerSnapshotTime++),
  //       blockNumber: 101,
  //     },
  //     {
  //       time: new Date(powerSnapshotTime++),
  //     },
  //   ]);
  //   await PowerSnapshot.save(powerSnapshots);
  //
  //   await PowerSnapshot.create({
  //     time: new Date(powerSnapshotTime++),
  //     blockNumber: 1000,
  //   }).save();
  //   const powerBoostingSnapshots = PowerBoostingSnapshot.create([
  //     {
  //       userId: user1.id,
  //       projectId: project1.id,
  //       percentage: 10,
  //       powerSnapshot: powerSnapshots[0],
  //     },
  //     {
  //       userId: user2.id,
  //       projectId: project1.id,
  //       percentage: 20,
  //       powerSnapshot: powerSnapshots[0],
  //     },
  //     {
  //       userId: user1.id,
  //       projectId: project1.id,
  //       percentage: 11,
  //       powerSnapshot: powerSnapshots[1],
  //     },
  //     {
  //       userId: user2.id,
  //       projectId: project1.id,
  //       percentage: 21,
  //       powerSnapshot: powerSnapshots[1],
  //     },
  //   ]);
  //
  //   const powerBalances = PowerBalanceSnapshot.create([
  //     {
  //       userId: user1.id,
  //       powerSnapshot: powerSnapshots[0],
  //     },
  //     {
  //       userId: user2.id,
  //       powerSnapshot: powerSnapshots[0],
  //     },
  //     {
  //       userId: user1.id,
  //       powerSnapshot: powerSnapshots[1],
  //     },
  //     {
  //       userId: user2.id,
  //       powerSnapshot: powerSnapshots[1],
  //     },
  //   ]);
  //   await PowerBalanceSnapshot.save(powerBalances);
  //   console.log('test1 step1')
  //   await PowerBoostingSnapshot.save(powerBoostingSnapshots);
  //   console.log('test1 step2')
  //
  //   assert.isNotEmpty(await getPowerBoostingSnapshotWithoutBalance());
  //   await addFillPowerSnapshotBalanceJobsToQueue();
  //   console.log('test1 step3')
  //
  //   await sleep(60_000);
  //   console.log('test1 step4')
  //
  //   assert.isEmpty(await getPowerBoostingSnapshotWithoutBalance());
  //   console.log('test1 step5')
  //
  // });

  it('should fill more than 20 snapShotBalances for powerSnapshots', async () => {
    const powerSnapshotTime = new Date().getTime() - 1 * 3600 * 1000; // 1 hour earlier

    for (let i = 0; i < 30; i++) {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const project = await saveProjectDirectlyToDb(createProjectData());
      const powerSnapshots = PowerSnapshot.create([
        {
          time: new Date(powerSnapshotTime + (i + 1) * 1000),
        },
        {
          time: new Date(powerSnapshotTime + 1 + (i + 1) * 1000),
        },
      ]);
      await PowerSnapshot.save(powerSnapshots);

      const powerBoostingSnapshots = PowerBoostingSnapshot.create([
        {
          userId: user.id,
          projectId: project.id,
          percentage: 10,
          powerSnapshot: powerSnapshots[0],
        },
        {
          userId: user2.id,
          projectId: project.id,
          percentage: 20,
          powerSnapshot: powerSnapshots[0],
        },
        {
          userId: user.id,
          projectId: project.id,
          percentage: 30,
          powerSnapshot: powerSnapshots[1],
        },
        {
          userId: user2.id,
          projectId: project.id,
          percentage: 40,
          powerSnapshot: powerSnapshots[1],
        },
      ]);
      await PowerBoostingSnapshot.save(powerBoostingSnapshots);

      const powerBalances = PowerBalanceSnapshot.create([
        {
          userId: user.id,
          powerSnapshot: powerSnapshots[0],
        },
        {
          userId: user2.id,
          powerSnapshot: powerSnapshots[0],
        },
        {
          userId: user.id,
          powerSnapshot: powerSnapshots[1],
        },
        {
          userId: user2.id,
          powerSnapshot: powerSnapshots[1],
        },
      ]);
      await PowerBalanceSnapshot.save(powerBalances);
    }

    assert.isNotEmpty(await getPowerBoostingSnapshotWithoutBalance());

    await addFillPowerSnapshotBalanceJobsToQueue();

    await sleep(60_000);

    assert.isEmpty(await getPowerBoostingSnapshotWithoutBalance());
  });
}
