import { PowerSnapshot } from '../entities/powerSnapshot';
import { findInCompletePowerSnapShots } from '../repositories/powerSnapshotRepository';
import { assert } from 'chai';
import { fillIncompletePowerSnapshots } from './powerSnapshotServices';
import moment from 'moment';

describe(
  'fillIncompletePowerSnapshots() test cases',
  fillIncompletePowerSnapshotsTestCases,
);

function fillIncompletePowerSnapshotsTestCases() {
  it('should fill all incomplete powerSnapshots', async () => {
    await PowerSnapshot.create({
      time: moment().subtract(5, 'minutes').toDate(),
    }).save();
    await PowerSnapshot.create({
      time: moment().subtract(4, 'minutes'),
      blockNumber: 18,
      roundNumber: 18,
    }).save();
    await PowerSnapshot.create({
      time: moment().subtract(3, 'minutes'),
    }).save();

    const incompletePowerSnapshots = await findInCompletePowerSnapShots();
    assert.isNotEmpty(incompletePowerSnapshots);
    await fillIncompletePowerSnapshots();
    const incompletePowerSnapshotsAfterRunningOurJob =
      await findInCompletePowerSnapShots();
    assert.isEmpty(incompletePowerSnapshotsAfterRunningOurJob);
  });
}
