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
import sinon from 'sinon';
import { getPowerBalanceAggregatorAdapter } from '../../adapters/adaptersFactory';
import { convertTimeStampToSeconds } from '../../utils/utils';

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

    await PowerSnapshot.create({
      time: new Date(powerSnapshotTime + 2000),
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

    // Give time to process jobs
    await sleep(5_000);
    assert.equal((await getPowerBoostingSnapshotWithoutBalance()).length, 0);
  });

  it('should not fill snapShotBalances when balance aggregator is not updated', async () => {
    const balanceAggregatorLastUpdateThresholdInSeconds = Number(
      process.env.BALANCE_AGGREGATOR_LAST_UPDATE_THRESHOLD_IN_SECONDS,
    );

    stub = sinon
      .stub(getPowerBalanceAggregatorAdapter(), 'getLeastIndexedBlockTimeStamp')
      // I added 5 seconds to balanceAggregatorLastUpdateThresholdInSeconds to make sure the difference is more than balanceAggregatorLastUpdateThresholdInSeconds
      .resolves(
        convertTimeStampToSeconds(new Date().getTime()) -
          (balanceAggregatorLastUpdateThresholdInSeconds + 5),
      );

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

    await PowerSnapshot.create({
      time: new Date(powerSnapshotTime + 2000),
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

    // Give time to process jobs
    await sleep(5_000);
    assert.isNotEmpty(await getPowerBoostingSnapshotWithoutBalance());
  });

  it('should fill more than 20 snapShotBalances for powerSnapshots', async () => {
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
