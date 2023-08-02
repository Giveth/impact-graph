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

  it('should fill snapShotBalances for powerSnapshots', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    let powerSnapshotTime = user1.id * 1000;
    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime++),
        blockNumber: 101,
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

    const powerBalances = PowerBalanceSnapshot.create([
      {
        userId: user1.id,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user2.id,
        powerSnapshot: powerSnapshots[0],
      },
      {
        userId: user1.id,
        powerSnapshot: powerSnapshots[1],
      },
      {
        userId: user2.id,
        powerSnapshot: powerSnapshots[1],
      },
    ]);
    await PowerBalanceSnapshot.save(powerBalances);

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
    await sleep(20000);
    assert.isEmpty(await getPowerBoostingSnapshotWithoutBalance());
  });
}
