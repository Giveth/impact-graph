import {
  addSyncUserPowerJobsToQueue,
  getPreviousGivbackRoundInfo,
  processSyncUserPowerJobs,
  runSyncUserPowersCronJob,
} from './syncUserPowers';
import {
  generateRandomEtheriumAddress,
  saveUserDirectlyToDb,
  sleep,
} from '../../../test/testUtils';
import {
  findUserPowerByUserIdAndRound,
  findUsersThatDidntSyncTheirPower,
} from '../../repositories/userPowerRepository';
import { assert } from 'chai';
import { logger } from '../../utils/logger';

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
    const { previousGivbackRound } = getPreviousGivbackRoundInfo();
    const userPower = await findUserPowerByUserIdAndRound({
      userId: firstUser.id,
      givbackRound: previousGivbackRound,
    });
    assert.isUndefined(userPower);
    await addSyncUserPowerJobsToQueue();

    // make sure queue runs all the job
    await sleep(10000);

    const userPowerAfterRunningJob = await findUserPowerByUserIdAndRound({
      userId: firstUser.id,
      givbackRound: previousGivbackRound,
    });
    assert.isOk(userPowerAfterRunningJob);
    assert.equal(userPowerAfterRunningJob?.givbackRound, previousGivbackRound);
  });

  it('should Fill lots of user powers after calling addSyncUserPowerJobsToQueue', async () => {
    for (let i = 0; i < 220; i++) {
      await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    }
    await addSyncUserPowerJobsToQueue();

    // make sure queue runs all the job
    await sleep(2000);

    const { previousGivbackRound } = getPreviousGivbackRoundInfo();

    const [users, count] = await findUsersThatDidntSyncTheirPower(
      previousGivbackRound,
    );
    assert.equal(
      count,
      0,
      'There would not be any user that havent synced power',
    );
  });
}
