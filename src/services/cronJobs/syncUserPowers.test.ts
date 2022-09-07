import {
  addSyncUserPowerJobsToQueue,
  getPreviousGivbackRoundInfo,
  processSyncUserPowerJobs,
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
    await sleep(3000);

    const userPowerAfterRunningJob = await findUserPowerByUserIdAndRound({
      userId: firstUser.id,
      givbackRound: previousGivbackRound,
    });
    assert.isOk(userPowerAfterRunningJob);
    assert.equal(userPowerAfterRunningJob?.givbackRound, previousGivbackRound);
    const [_, count] = await findUsersThatDidntSyncTheirPower(
      previousGivbackRound,
    );
    assert.equal(
      count,
      0,
      'There would not be any user that havent synced power',
    );
  });
}
