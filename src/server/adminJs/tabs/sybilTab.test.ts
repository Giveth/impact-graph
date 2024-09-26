import moment from 'moment';
import { assert } from 'chai';
import {
  generateRandomEtheriumAddress,
  saveUserDirectlyToDb,
} from '../../../../test/testUtils';
import { QfRound } from '../../../entities/qfRound';
import { createSybil } from './sybilTab';
import { errorMessages } from '../../../utils/errorMessages';
import { Sybil } from '../../../entities/sybil';

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
          walletAddress: user1.walletAddress,
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
  it('Should not create a new sybil with single user data when there is in the DB already', async () => {
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
    const sybil = new Sybil();
    sybil.userId = user1.id;
    sybil.walletAddress = user1.walletAddress as string;
    sybil.qfRoundId = qfRound.id;
    await sybil.save();
    await createSybil(
      {
        payload: {
          walletAddress: user1.walletAddress,
          qfRoundId: qfRound.id,
        },
      },
      {
        send: response => {
          assert.equal(response.notice.type, 'danger');
          assert.equal(
            response.notice.message,
            errorMessages.SYBIL_RECORD_IS_IN_DB_ALREADY,
          );
        },
      },
    );
  });
  it('Should not create a new sybil with wrong wallet address', async () => {
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
          walletAddress: generateRandomEtheriumAddress(),
          qfRoundId: qfRound.id,
        },
      },
      {
        send: response => {
          assert.equal(response.notice.type, 'danger');
          assert.equal(response.notice.message, errorMessages.USER_NOT_FOUND);
        },
      },
    );
  });
  it('Should create sybils with csv for exising users', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfRound = await QfRound.create({
      isActive: false,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    // convert json to csv
    const csvData = `qfRoundId,walletAddress\n${qfRound.id},${user1.walletAddress}\n${qfRound.id},${user2.walletAddress}`;
    await createSybil(
      {
        payload: {
          csvData,
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
  it('Should not create sybils with csv for non-exising users', async () => {
    const qfRound = await QfRound.create({
      isActive: false,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    // convert json to csv
    const csvData = `qfRoundId,walletAddress\n${
      qfRound.id
    },${generateRandomEtheriumAddress()}\n${
      qfRound.id
    },${generateRandomEtheriumAddress()}`;
    await createSybil(
      {
        payload: {
          csvData,
        },
      },
      {
        send: response => {
          assert.equal(response.notice.type, 'danger');
          assert.equal(
            response.notice.message,
            errorMessages.NONE_OF_WALLET_ADDRESSES_FOUND_IN_DB,
          );
        },
      },
    );
  });
  it('Should create sybils with csv for exising users when there is some user that doesnt exist as well', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const qfRound = await QfRound.create({
      isActive: false,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();
    // convert json to csv
    const csvData = `qfRoundId,walletAddress\n${qfRound.id},${
      user1.walletAddress
    }\n${qfRound.id},${user2.walletAddress}\n${
      qfRound.id
    },${generateRandomEtheriumAddress()}`;
    await createSybil(
      {
        payload: {
          csvData,
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
