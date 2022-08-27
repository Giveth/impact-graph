import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  findPowerBoostings,
  findUserPowerBoosting,
  insertSinglePowerBoosting,
  setMultipleBoosting,
} from './powerBoostingRepository';
import { assert, use } from 'chai';

describe('findUserPowerBoosting() testCases', findUserPowerBoostingTestCases);
describe('findPowerBoostings() testCases', findPowerBoostingsTestCases);
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

function findPowerBoostingsTestCases() {
  it('should return all power boostings, filter by projectId', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 1,
      orderBy: {
        field: 'updatedAt',
        direction: 'DESC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    powerBoostings.forEach(powerBoosting => {
      assert.equal(powerBoosting.project.id, firstProject.id);
    });
  });
  it('should return all power boostings, filter by userId', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 1,
      orderBy: {
        field: 'updatedAt',
        direction: 'DESC',
      },
      userId: firstUser.id,
    });
    assert.equal(totalCount, 2);
    powerBoostings.forEach(powerBoosting => {
      assert.equal(powerBoosting.user.id, firstUser.id);
    });
  });
  it('should return all power boostings, filter by userId and projectId', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 1,
      orderBy: {
        field: 'updatedAt',
        direction: 'DESC',
      },
      userId: firstUser.id,
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 1);
    powerBoostings.forEach(powerBoosting => {
      assert.equal(powerBoosting.user.id, firstUser.id);
      assert.equal(powerBoosting.project.id, firstProject.id);
    });
  });
  it('should return all power boostings, filter by projectId, with sending take', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const firstPower = await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 1,
    });
    const secondPower = await insertSinglePowerBoosting({
      user: secondUser,
      project: firstProject,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: firstUser,
      project: secondProject,
      percentage: 2,
    });

    await insertSinglePowerBoosting({
      user: secondUser,
      project: secondProject,
      percentage: 4,
    });
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 1,
      skip: 0,
      orderBy: {
        field: 'updatedAt',
        direction: 'DESC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.equal(powerBoostings.length, 1);
    powerBoostings.forEach(powerBoosting => {
      assert.equal(powerBoosting.id, secondPower.id);
    });
  });
  it('should return all power boostings, filter by projectId, with sending skip', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const firstPower = await insertSinglePowerBoosting({
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 1,
      skip: 1,
      orderBy: {
        field: 'updatedAt',
        direction: 'DESC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.equal(powerBoostings.length, 1);
    assert.equal(powerBoostings[0].id, firstPower.id);
  });
  it('should return all power boostings, filter by projectId,order by updateAt ASC', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 0,
      orderBy: {
        field: 'updatedAt',
        direction: 'ASC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.isTrue(powerBoostings[0].updatedAt < powerBoostings[1].updatedAt);
  });
  it('should return all power boostings, filter by projectId,order by updateAt DESC', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 0,
      orderBy: {
        field: 'updatedAt',
        direction: 'DESC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.isTrue(powerBoostings[0].updatedAt > powerBoostings[1].updatedAt);
  });
  it('should return all power boostings, filter by projectId,order by createdAt ASC', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 0,
      orderBy: {
        field: 'createdAt',
        direction: 'ASC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.isTrue(powerBoostings[0].createdAt < powerBoostings[1].createdAt);
  });
  it('should return all power boostings, filter by projectId,order by createdAt DESC', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 0,
      orderBy: {
        field: 'createdAt',
        direction: 'DESC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.isTrue(powerBoostings[0].createdAt > powerBoostings[1].createdAt);
  });

  it('should return all power boostings, filter by projectId,order by percentage ASC', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 0,
      orderBy: {
        field: 'percentage',
        direction: 'ASC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.isTrue(powerBoostings[0].percentage < powerBoostings[1].percentage);
  });
  it('should return all power boostings, filter by projectId,order by percentage DESC', async () => {
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
    const [powerBoostings, totalCount] = await findPowerBoostings({
      take: 20,
      skip: 0,
      orderBy: {
        field: 'percentage',
        direction: 'DESC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.isTrue(powerBoostings[0].percentage > powerBoostings[1].percentage);
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
