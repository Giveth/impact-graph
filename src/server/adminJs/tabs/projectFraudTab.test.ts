import moment from 'moment';
import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../../../test/testUtils';
import { QfRound } from '../../../entities/qfRound';
import { createProjectFraud } from './projectFraudTab';
import { errorMessages } from '../../../utils/errorMessages';

describe('createSybil test cases', createSybilTestCases);

function createSybilTestCases() {
  it('Should create a new projectFraud with single project', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData(), user1);
    const qfRound = await QfRound.create({
      isActive: false,
      name: 'test',
      allocatedFund: 100,
      minimumPassportScore: 8,
      slug: new Date().getTime().toString(),
      beginDate: new Date(),
      endDate: moment().add(10, 'days').toDate(),
    }).save();

    await createProjectFraud(
      {
        payload: {
          projectId: project.id,
          qfRoundId: qfRound.id,
        },
      },
      {
        send: response => {
          assert.equal(response.notice.type, 'success');
          assert.equal(
            response.notice.message,
            'Project Fraud successfully created',
          );
        },
      },
    );
  });
  it('Should create projectFrauds with csv for exising projects', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData(), user1);
    const project2 = await saveProjectDirectlyToDb(createProjectData(), user1);

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
    const csvData = `qfRoundId,slug\n${qfRound.id},${project1.slug}\n${qfRound.id},${project2.slug}`;
    await createProjectFraud(
      {
        payload: {
          csvData,
        },
      },
      {
        send: response => {
          assert.equal(response.notice.type, 'success');
          assert.equal(
            response.notice.message,
            'Project Fraud successfully created',
          );
        },
      },
    );
  });
  it('Should not create project_fraud with csv for non-exising users', async () => {
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
    const csvData = `qfRoundId,slug\n${qfRound.id},${new Date().getTime()}\n${
      qfRound.id
    },${new Date().getTime()}`;
    await createProjectFraud(
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
            errorMessages.NO_VALID_PROJECTS_FOUND,
          );
        },
      },
    );
  });
  it('Should create project_frauds with csv for exising projects when there is some projects that doesnt exist', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData(), user1);
    const project2 = await saveProjectDirectlyToDb(createProjectData(), user2);

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
    const csvData = `qfRoundId,slug\n${qfRound.id},${project1.slug}\n${
      qfRound.id
    },${project2.slug}\n${qfRound.id},${new Date().getTime()}`;
    await createProjectFraud(
      {
        payload: {
          csvData,
        },
      },
      {
        send: response => {
          assert.equal(response.notice.type, 'success');
          assert.equal(
            response.notice.message,
            'Project Fraud successfully created',
          );
        },
      },
    );
  });
}
