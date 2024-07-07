import { assert } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
  sleep,
} from '../../test/testUtils';
import {
  findUserPowerBoosting,
  setMultipleBoosting,
} from '../repositories/powerBoostingRepository';
import { changeUserBoostingsAfterProjectCancelled } from './powerBoostingService';

describe(
  'changeUserBoostingsAfterProjectCancelled',
  changeUserBoostingsAfterProjectCancelledTestCases,
);

function changeUserBoostingsAfterProjectCancelledTestCases() {
  it('should change user percentage to zero when project cancelled', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const projectThatWouldGetCancelled =
      await saveProjectDirectlyToDb(createProjectData());
    await setMultipleBoosting({
      userId: user1.id,
      projectIds: [firstProject.id, projectThatWouldGetCancelled.id],
      percentages: [80, 20],
    });
    await setMultipleBoosting({
      userId: user2.id,
      projectIds: [firstProject.id, projectThatWouldGetCancelled.id],
      percentages: [70, 30],
    });
    await changeUserBoostingsAfterProjectCancelled({
      projectId: projectThatWouldGetCancelled.id,
    });

    // Changing percentages is async we sleep some milli seconds to make sure all updates has been done
    await sleep(100);
    const firstUserBoostings = await findUserPowerBoosting(user1.id);
    const secondUserBoostings = await findUserPowerBoosting(user2.id);

    assert.equal(firstUserBoostings.length, 1);
    assert.equal(secondUserBoostings.length, 1);
    assert.equal(firstUserBoostings[0].percentage, 100);
    assert.equal(firstUserBoostings[0].projectId, firstProject.id);
    assert.equal(secondUserBoostings[0].percentage, 100);
    assert.equal(secondUserBoostings[0].projectId, firstProject.id);
  });
  it('should change user percentage to zero when project cancelled, even when just has 1 boositng', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const projectThatWouldGetCancelled =
      await saveProjectDirectlyToDb(createProjectData());
    await setMultipleBoosting({
      userId: user1.id,
      projectIds: [projectThatWouldGetCancelled.id],
      percentages: [100],
    });

    await changeUserBoostingsAfterProjectCancelled({
      projectId: projectThatWouldGetCancelled.id,
    });

    // Changing percentages is async we sleep some milli seconds to make sure all updates has been done
    await sleep(100);
    const firstUserBoostings = await findUserPowerBoosting(user1.id);

    assert.equal(firstUserBoostings.length, 0);
  });
}
