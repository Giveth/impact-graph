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

describe(
  'processFillPowerSnapshotJobs test cases',
  processFillPowerSnapshotJobsTestCases,
);

async function processFillPowerSnapshotJobsTestCases() {
  await processFillPowerSnapshotJobs();

  it('should fill snapShotBalances for powerSnapshots', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    let powerSnapshotTime = user1.id * 1000;
    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime++),
        blockNumber: 100,
      },
      {
        time: new Date(powerSnapshotTime++),
      },
    ]);
    await PowerSnapshot.save(powerSnapshots);

    await PowerSnapshot.create({
      time: new Date(powerSnapshotTime++),
      blockNumber: 1000,
    }).save();
    const powerBoostingSnapshots = PowerBoostingSnapshot.create([
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 10,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user2.id,
        projectId: project1.id,
        percentage: 20,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 11,
        powerSnapshot: powerSnapshots[1],
      },
      {
        userId: user2.id,
        projectId: project1.id,
        percentage: 21,
        powerSnapshot: powerSnapshots[1],
      },
    ]);
    await PowerBoostingSnapshot.save(powerBoostingSnapshots);
    assert.isNotEmpty(await getPowerBoostingSnapshotWithoutBalance());
    await addFillPowerSnapshotBalanceJobsToQueue();
    await sleep(5000);
    assert.isEmpty(await getPowerBoostingSnapshotWithoutBalance());
  });

  it('should fill more than 100 snapShotBalances for powerSnapshots', async () => {
    for (let i = 0; i < 110; i++) {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const project = await saveProjectDirectlyToDb(createProjectData());

      let powerSnapshotTime = user.id * 1000;
      const powerSnapshots = PowerSnapshot.create([
        {
          time: new Date(powerSnapshotTime++),
          blockNumber: 10000 + i,
        },
        {
          time: new Date(powerSnapshotTime++),
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
      ]);
      await PowerBoostingSnapshot.save(powerBoostingSnapshots);
    }

    assert.isNotEmpty(await getPowerBoostingSnapshotWithoutBalance());
    await addFillPowerSnapshotBalanceJobsToQueue();
    await sleep(2000);
    assert.isEmpty(await getPowerBoostingSnapshotWithoutBalance());
  });
}
