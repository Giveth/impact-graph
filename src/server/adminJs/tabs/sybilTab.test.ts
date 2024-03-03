import {
  generateRandomEtheriumAddress,
  saveUserDirectlyToDb,
} from '../../../../test/testUtils';
import { QfRound } from '../../../entities/qfRound';
import moment from 'moment';
import { createSybil } from './sybilTab';
import { assert } from 'chai';

describe('createSybil test cases', createSybilTestCases);

function createSybilTestCases() {
  it('Should create a new sybil with single user data', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfRound = await QfRound.create({
      isActive: false,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();

    await createSybil(
      {
        payload: {
          userId: user1.id,
          qfRoundId: qfRound.id,
        },
      },
      {
        send: response => {
          assert.equal(response.notice.type, 'success');
          assert.equal(response.notice.message, 'Sybil successfully created');
        },
      },
    );
  });
}
