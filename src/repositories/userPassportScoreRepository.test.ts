import {
  findPassportScoreByUserIdAndQfRoundId,
  insertNewUserPassportScore,
} from './userPassportScoreRepository';
import {
  generateRandomEtheriumAddress,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { QfRound } from '../entities/qfRound';
import { assert } from 'chai';
import moment from 'moment';

describe(
  'findPassportScoreByUserIdAndQfRoundId() test cases',
  findPassportScoreByUserIdAndQfRoundIdTestCases,
);

function findPassportScoreByUserIdAndQfRoundIdTestCases() {
  it('should return null if record doesnt exist', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfRound = QfRound.create({
      isActive: false,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8.02,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    const userPssportScore = await findPassportScoreByUserIdAndQfRoundId({
      userId: user.id,
      qfRoundId: qfRound.id,
    });
    assert.isNull(userPssportScore);
  });
  it('should return record successfully', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfRound = QfRound.create({
      isActive: false,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    });
    await qfRound.save();
    const passportScore = 10;
    await insertNewUserPassportScore({
      userId: user.id,
      qfRoundId: qfRound.id,
      passportScore,
      passportStamps: 2,
    });
    const userPssportScore = await findPassportScoreByUserIdAndQfRoundId({
      userId: user.id,
      qfRoundId: qfRound.id,
    });
    assert.isOk(userPssportScore);
    assert.equal(userPssportScore?.passportScore, passportScore);
  });
}
