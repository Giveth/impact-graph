import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  findUserPowerBoosting,
  insertSinglePowerBoosting,
  setMultipleBoosting,
} from './powerBoostingRepository';
import { assert } from 'chai';

describe('findUserPowerBoosting() testCases', findUserPowerBoostingTestCases);
describe('setMultipleBoosting() testCases', setMultipleBoostingTestCases);

function findUserPowerBoostingTestCases() {
  it('should return all non-zero power boostings', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 1,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: firstProject,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project: secondProject,
      percentage: 4,
    });
    const firstUserPowerBoostings = await findUserPowerBoosting(firstUser.id);
    assert.equal(firstUserPowerBoostings.length, 2);
    firstUserPowerBoostings.forEach(powerBoosting => {
      assert.equal(powerBoosting.user.id, firstUser.id);
    });
  });
}

function setMultipleBoostingTestCases() {
  it('should set multiple boosting for one user', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const thirdProject = await saveProjectDirectlyToDb(createProjectData());
    const userBoostings = await setMultipleBoosting({
      userId: user.id,
      projectIds: [firstProject.id, secondProject.id, thirdProject.id],
      percentages: [12, 20, 14],
    });
    assert.equal(userBoostings.length, 3);
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === firstProject.id &&
          powerBoosting.percentage === 12,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === secondProject.id &&
          powerBoosting.percentage === 20,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === thirdProject.id &&
          powerBoosting.percentage === 14,
      ),
    );
  });
  it('should set multiple boosting for one user and remove previous boostings', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const thirdProject = await saveProjectDirectlyToDb(createProjectData());
    const fourthProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user,
      project: fourthProject,
      percentage: 10,
    });

    // This would remove previous power boostings
    const userBoostings = await setMultipleBoosting({
      userId: user.id,
      projectIds: [firstProject.id, secondProject.id, thirdProject.id],
      percentages: [12, 20, 14],
    });
    assert.equal(userBoostings.length, 3);
    assert.isNotOk(
      userBoostings.find(
        powerBoosting => powerBoosting.project.id === fourthProject.id,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === firstProject.id &&
          powerBoosting.percentage === 12,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === secondProject.id &&
          powerBoosting.percentage === 20,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === thirdProject.id &&
          powerBoosting.percentage === 14,
      ),
    );
  });
}
