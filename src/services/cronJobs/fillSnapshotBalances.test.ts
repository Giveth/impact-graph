import { assert } from 'chai';
import sinon from 'sinon';
import {
  addFillPowerSnapshotBalanceJobsToQueue,
  processFillPowerSnapshotJobs,
} from './fillSnapshotBalances.js';
import { getPowerBoostingSnapshotWithoutBalance } from '../../repositories/powerSnapshotRepository.js';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../../test/testUtils.js';
import { PowerSnapshot } from '../../entities/powerSnapshot.js';
import { PowerBoostingSnapshot } from '../../entities/powerBoostingSnapshot.js';
import { AppDataSource } from '../../orm.js';
import { PowerBalanceSnapshot } from '../../entities/powerBalanceSnapshot.js';
import { getPowerBalanceAggregatorAdapter } from '../../adapters/adaptersFactory.js';
import { convertTimeStampToSeconds } from '../../utils/utils.js';

describe(
  'processFillPowerSnapshotJobs test cases',
  processFillPowerSnapshotJobsTestCases,
);

async function processFillPowerSnapshotJobsTestCases() {
  let stub: sinon.SinonStub;

  beforeEach(async () => {
    await AppDataSource.getDataSource().query(
      'truncate power_snapshot cascade',
    );
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  afterEach(() => {
    stub?.restore();
  });

  before(async () => {
    await processFillPowerSnapshotJobs();
  });

  it('should fill snapShotBalances for powerSnapshots', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const powerSnapshotTime = new Date().getTime() - 1 * 3600 * 1000; // 1 hour earlier

    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime),
      },
      {
        time: new Date(powerSnapshotTime + 1000),
      },
    ]);
    await PowerSnapshot.save(powerSnapshots);

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

    // Give time to process jobs
    await sleep(5_000);
    assert.equal((await getPowerBoostingSnapshotWithoutBalance()).length, 0);
  });

  it('should not fill snapShotBalances when balance aggregator is not updated after powerSnapshot', async () => {
    const powerSnapshotTimeBeforeSyncTime =
      new Date().getTime() - 2 * 3600 * 1000; // 2 hour earlier
    const powerSnapshotTime = new Date().getTime() - 1 * 3600 * 1000; // 1 hour earlier

    stub = sinon
      .stub(getPowerBalanceAggregatorAdapter(), 'getLeastIndexedBlockTimeStamp')
      // I decreased powerSnapshotTime 5 seconds to make sure those snapshot would not fill balances
      .resolves(convertTimeStampToSeconds(powerSnapshotTime) - 5);

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    const powerSnapshots = PowerSnapshot.create([
      {
        time: new Date(powerSnapshotTime),
      },
      {
        time: new Date(powerSnapshotTime + 1000),
      },
      {
        time: new Date(powerSnapshotTimeBeforeSyncTime),
      },
    ]);
    await PowerSnapshot.save(powerSnapshots);

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
      {
        userId: user1.id,
        projectId: project1.id,
        percentage: 12,
        powerSnapshot: powerSnapshots[2],
      },
      {
        userId: user2.id,
        projectId: project1.id,
        percentage: 32,
        powerSnapshot: powerSnapshots[2],
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
      {
        userId: user1.id,
        powerSnapshot: powerSnapshots[2],
      },
      {
        userId: user2.id,
        powerSnapshot: powerSnapshots[2],
      },
    ]);
    await PowerBalanceSnapshot.save(powerBalances);
    await PowerBoostingSnapshot.save(powerBoostingSnapshots);
    assert.isNotEmpty(await getPowerBoostingSnapshotWithoutBalance());
    await addFillPowerSnapshotBalanceJobsToQueue();

    // Give time to process jobs
    await sleep(5_000);
    const powerBoostingWithoutBalances =
      await getPowerBoostingSnapshotWithoutBalance();
    assert.equal(powerBoostingWithoutBalances.length, 4);
    powerBoostingWithoutBalances.forEach(pb => {
      // powerSnapshots[2] time is before synced time of balance aggregator, so it must have been filled
      assert.notEqual(pb.powerSnapshotId, powerSnapshots[2].id);
    });
  });

  it('should fill snapshot balances when we have snapshots taken in same seconds', async () => {
    const powerSnapshotTime = new Date().getTime() - 1 * 3600 * 1000; // 1 hour earlier

    for (let i = 0; i < 110; i++) {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      const project = await saveProjectDirectlyToDb(createProjectData());
      const powerSnapshots = PowerSnapshot.create([
        {
          time: new Date(powerSnapshotTime + (i + 1) * 1000),
        },
        {
          time: new Date(powerSnapshotTime + 500 + (i + 1) * 1000),
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

    await sleep(4_000);

    assert.equal((await getPowerBoostingSnapshotWithoutBalance()).length, 0);
    // assert.isEmpty(await getPowerBoostingSnapshotWithoutBalance());
  });
}
