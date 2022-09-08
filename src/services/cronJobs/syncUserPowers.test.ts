import {
  addSyncUserPowerJobsToQueue,
  getPreviousGivbackRoundInfo,
  processSyncUserPowerJobs,
  runSyncUserPowersCronJob,
} from './syncUserPowers';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../../test/testUtils';
import {
  findUserPowerByUserIdAndRound,
  findUsersThatDidntSyncTheirPower,
  insertNewUserPowers,
} from '../../repositories/userPowerRepository';
import { assert } from 'chai';
import { logger } from '../../utils/logger';
import { insertSinglePowerBoosting } from '../../repositories/powerBoostingRepository';
import { create } from 'domain';

describe(
  'runSyncUserPowersCronJob() test cases',
  runSyncUserPowersCronJobTestCases,
);

function runSyncUserPowersCronJobTestCases() {
  // Call this to set handler for job events
  processSyncUserPowerJobs();

  it('should Fill user powers after calling addSyncUserPowerJobsToQueue', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project,
      percentage: 20,
    });
    const { previousGivbackRound } = getPreviousGivbackRoundInfo();
    const userPower = await findUserPowerByUserIdAndRound({
      userId: firstUser.id,
      givbackRound: previousGivbackRound,
    });
    assert.isUndefined(userPower);
    await addSyncUserPowerJobsToQueue();

    // make sure queue runs all the job
    await sleep(2000);

    const userPowerAfterRunningJob = await findUserPowerByUserIdAndRound({
      userId: firstUser.id,
      givbackRound: previousGivbackRound,
    });
    assert.isOk(userPowerAfterRunningJob);
    assert.equal(userPowerAfterRunningJob?.givbackRound, previousGivbackRound);
  });

  it('should Fill lots of user powers after calling addSyncUserPowerJobsToQueue', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    const numberOfInsertedUsers = 220;
    for (let i = 0; i < numberOfInsertedUsers; i++) {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      await insertSinglePowerBoosting({
        user,
        project,
        percentage: 20,
      });
    }
    const { previousGivbackRound } = getPreviousGivbackRoundInfo();

    const [, countBefore] = await findUsersThatDidntSyncTheirPower(
      previousGivbackRound,
    );
    assert.isTrue(countBefore >= numberOfInsertedUsers);

    await addSyncUserPowerJobsToQueue();

    // make sure queue runs all the job
    await sleep(2000);

    const [, count] = await findUsersThatDidntSyncTheirPower(
      previousGivbackRound,
    );
    assert.equal(
      count,
      0,
      'There would not be any user that havent synced power',
    );
  });
}
