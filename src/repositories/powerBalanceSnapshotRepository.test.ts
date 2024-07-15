import {
  assertNotThrowsAsync,
  generateRandomEtheriumAddress,
  saveUserDirectlyToDb,
} from '../../test/testUtils.js';
import { PowerSnapshot } from '../entities/powerSnapshot.js';
import { addOrUpdatePowerSnapshotBalances } from './powerBalanceSnapshotRepository.js';

describe(
  'createPowerSnapshotBalances test cases',
  createPowerSnapshotBalancesTestCases,
);

function createPowerSnapshotBalancesTestCases() {
  it('should create power snapshot balance', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    let powerSnapshotTime = user.id * 1000;

    const powerSnapshot = await PowerSnapshot.create({
      time: new Date(powerSnapshotTime++),
      blockNumber: powerSnapshotTime,
    }).save();

    await assertNotThrowsAsync(async () => {
      await addOrUpdatePowerSnapshotBalances({
        powerSnapshotId: powerSnapshot.id,
        userId: user.id,
        balance: 100,
      });
    });
  });
}
