import { PowerSnapshot } from '../entities/powerSnapshot';
import {
  findInCompletePowerSnapShots,
  findPowerSnapshotById,
} from './powerSnapshotRepository';
import { assert } from 'chai';
import moment from 'moment';

describe(
  'findInCompletePowerSnapShots() test cases',
  findInCompletePowerSnapShotsTestCases,
);
describe('findPowerSnapshotById() test cases', findPowerSnapshotByIdTestCases);

function findInCompletePowerSnapShotsTestCases() {
  it('should return just incomplete powerSnapshots', async () => {
    const snapShot1 = await PowerSnapshot.create({
      time: moment().subtract(10, 'minutes'),
    }).save();
    const snapShot2 = await PowerSnapshot.create({
      time: moment().subtract(8, 'minutes'),
      blockNumber: 12,
      roundNumber: 12,
    }).save();
    const snapShot3 = await PowerSnapshot.create({
      time: moment().subtract(9, 'minutes'),
    }).save();
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    assert.isOk(
      incompleteSnapshots.find(snapshot => snapshot.id === snapShot1.id),
    );
    assert.isNotOk(
      incompleteSnapshots.find(snapshot => snapshot.id === snapShot2.id),
    );
    assert.isOk(
      incompleteSnapshots.find(snapshot => snapshot.id === snapShot3.id),
    );
  });
}

function findPowerSnapshotByIdTestCases() {
  it('should find powerSnapshot by id', async () => {
    const snapShot = await PowerSnapshot.create({
      time: new Date(),
      blockNumber: 13,
      roundNumber: 13,
    }).save();

    const result = await findPowerSnapshotById(snapShot.id);
    assert.isOk(result);
    assert.equal(result?.id, snapShot.id);
    assert.equal(result?.blockNumber, snapShot.blockNumber);
  });

  it('should not find powerSnapshot by invalid id', async () => {
    const result = await findPowerSnapshotById(100000000);
    assert.isNotOk(result);
  });
}
