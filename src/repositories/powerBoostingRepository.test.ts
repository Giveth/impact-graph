import {
  assertThrowsAsync,
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import {
  cancelProjectBoosting,
  findPowerBoostings,
  findUserPowerBoosting,
  findUsersWhoBoostedProject,
  getPowerBoostingSnapshotRound,
  insertSinglePowerBoosting,
  setMultipleBoosting,
  setSingleBoosting,
  takePowerBoostingSnapshot,
} from './powerBoostingRepository';
import { assert, use } from 'chai';
import { PowerBoosting } from '../entities/powerBoosting';
import { PowerSnapshot } from '../entities/powerSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { getConnection } from 'typeorm';
import { errorMessages } from '../utils/errorMessages';

describe('findUserPowerBoosting() testCases', findUserPowerBoostingTestCases);
describe('findPowerBoostings() testCases', findPowerBoostingsTestCases);
describe('setMultipleBoosting() testCases', setMultipleBoostingTestCases);
describe('setSingleBoosting() testCases', setSingleBoostingTestCases);
describe('power boosting snapshot testCases', powerBoostingSnapshotTests);
describe(
  'findUsersWhoBoostedProject() testCases',
  findUsersWhoBoostedProjectTests,
);

function findUsersWhoBoostedProjectTests() {
  it('should find wallet addresses of who boosted a project', async () => {
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const thirdUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const fourthUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project,
      percentage: 1,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project,
      percentage: 2,
    });
    await insertSinglePowerBoosting({
      user: thirdUser,
      project,
      percentage: 3,
    });
    await insertSinglePowerBoosting({
      user: fourthUser,
      project,
      percentage: 0,
    });

    const users = await findUsersWhoBoostedProject(project.id);
    assert.equal(users.length, 3);
    assert.isOk(
      users.find(user => user.walletAddress === firstUser.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === secondUser.walletAddress),
    );
    assert.isOk(
      users.find(user => user.walletAddress === thirdUser.walletAddress),
    );
    assert.isNotOk(
      users.find(user => user.walletAddress === fourthUser.walletAddress),
    );
  });
}

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
  it('should return all power boostings, filter by projectId', async () => {
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
      orderBy: {
        field: 'updatedAt',
        direction: 'DESC',
      },
      projectId: firstProject.id,
    });
    assert.equal(totalCount, 2);
    assert.equal(powerBoostings.length, 2);
  });
  it('should return all (500) power boostings, filter by projectId', async () => {
    const project = await saveProjectDirectlyToDb(createProjectData());
    for (let i = 0; i < 500; i++) {
      const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
      await insertSinglePowerBoosting({
        user,
        project,
        percentage: 3,
      });
    }

    const [powerBoostings, totalCount] = await findPowerBoostings({
      orderBy: {
        field: 'updatedAt',
        direction: 'DESC',
      },
      projectId: project.id,
    });
    assert.equal(totalCount, 500);
    assert.equal(powerBoostings.length, 500);
    powerBoostings.forEach(pb => assert.equal(pb.projectId, project.id));
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
      percentages: [40, 20, 40],
    });
    assert.equal(userBoostings.length, 3);
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === firstProject.id &&
          powerBoosting.percentage === 40,
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
          powerBoosting.percentage === 40,
      ),
    );
  });
  it('should set multiple boosting for one user when js summation shows a little greater number', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const thirdProject = await saveProjectDirectlyToDb(createProjectData());
    const fourthProject = await saveProjectDirectlyToDb(createProjectData());
    const fifthProject = await saveProjectDirectlyToDb(createProjectData());
    const userBoostings = await setMultipleBoosting({
      userId: user.id,
      projectIds: [
        firstProject.id,
        secondProject.id,
        thirdProject.id,
        fourthProject.id,
        fifthProject.id,
      ],
      percentages: [50.46, 18, 12.62, 9.46, 9.46],
    });
    assert.equal(userBoostings.length, 5);
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === firstProject.id &&
          powerBoosting.percentage === 50.46,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === secondProject.id &&
          powerBoosting.percentage === 18,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === thirdProject.id &&
          powerBoosting.percentage === 12.62,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === fourthProject.id &&
          powerBoosting.percentage === 9.46,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === fifthProject.id &&
          powerBoosting.percentage === 9.46,
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
      percentages: [10, 10, 80],
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
          powerBoosting.percentage === 10,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === secondProject.id &&
          powerBoosting.percentage === 10,
      ),
    );
    assert.isOk(
      userBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === thirdProject.id &&
          powerBoosting.percentage === 80,
      ),
    );
  });
}

function setSingleBoostingTestCases() {
  it('should set single boosting with 100%, when boosted multi project', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const thirdProject = await saveProjectDirectlyToDb(createProjectData());
    await setMultipleBoosting({
      userId: user.id,
      projectIds: [firstProject.id, secondProject.id, thirdProject.id],
      percentages: [40, 20, 40],
    });
    await setSingleBoosting({
      userId: user.id,
      projectId: firstProject.id,
      percentage: 100,
    });
    const [userPowerBoostings] = await findPowerBoostings({
      userId: user.id,
      orderBy: {
        field: 'updatedAt',
        direction: 'ASC',
      },
    });
    assert.equal(userPowerBoostings.length, 1);
    assert.equal(userPowerBoostings[0].percentage, 100);
    assert.equal(userPowerBoostings[0].projectId, firstProject.id);
  });
  it('should set single boosting with 100%', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());

    await setSingleBoosting({
      userId: user.id,
      projectId: firstProject.id,
      percentage: 100,
    });

    const [userPowerBoostings] = await findPowerBoostings({
      userId: user.id,
      orderBy: {
        field: 'updatedAt',
        direction: 'ASC',
      },
    });

    assert.equal(userPowerBoostings.length, 1);
    assert.equal(userPowerBoostings[0].percentage, 100);
    assert.equal(userPowerBoostings[0].projectId, firstProject.id);
  });

  it('should set single boosting with 0%, when boosted multi project', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    const secondProject = await saveProjectDirectlyToDb(createProjectData());
    const thirdProject = await saveProjectDirectlyToDb(createProjectData());
    await setMultipleBoosting({
      userId: user.id,
      projectIds: [firstProject.id, secondProject.id, thirdProject.id],
      percentages: [20, 40, 40],
    });

    await setSingleBoosting({
      userId: user.id,
      projectId: firstProject.id,
      percentage: 0,
    });
    const [userPowerBoostings] = await findPowerBoostings({
      userId: user.id,
      orderBy: {
        field: 'updatedAt',
        direction: 'ASC',
      },
    });

    assert.equal(userPowerBoostings.length, 2);

    assert.isOk(
      userPowerBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === secondProject.id &&
          powerBoosting.percentage === 50,
      ),
    );
    assert.isOk(
      userPowerBoostings.find(
        powerBoosting =>
          powerBoosting.project.id === thirdProject.id &&
          powerBoosting.percentage === 50,
      ),
    );
  });
  it('should set single boosting with 0%', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());

    await setSingleBoosting({
      userId: user.id,
      projectId: firstProject.id,
      percentage: 100,
    });

    await cancelProjectBoosting({
      userId: user.id,
      projectId: firstProject.id,
    });
    const [userPowerBoostings] = await findPowerBoostings({
      userId: user.id,
      orderBy: {
        field: 'updatedAt',
        direction: 'ASC',
      },
    });

    assert.equal(userPowerBoostings.length, 0);
  });
  it('should get error when set single boosting with something between 0-100', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    await assertThrowsAsync(async () => {
      await setSingleBoosting({
        userId: user.id,
        projectId: firstProject.id,
        percentage: 70,
      });
    }, errorMessages.ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT);
  });
}

function powerBoostingSnapshotTests() {
  it('should take snapshot of power boosting', async () => {
    await PowerBoosting.clear();
    await getConnection().query('truncate power_snapshot cascade');

    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project2,
      percentage: 30,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 30,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project2,
      percentage: 40,
    });

    await takePowerBoostingSnapshot();

    const snapshot = await PowerSnapshot.findOne();
    assert.isDefined(snapshot);

    const [powerBoostings, powerBoostingCounts] =
      await PowerBoosting.findAndCount({
        take: 4,
        select: ['id', 'projectId', 'userId', 'percentage'],
      });
    const [powerBoostingSnapshots, powerBoostingSnapshotsCounts] =
      await PowerBoostingSnapshot.findAndCount({
        where: { powerSnapshotId: snapshot?.id },
        take: 4,
      });

    assert.equal(powerBoostingCounts, powerBoostingSnapshotsCounts);
    powerBoostings.forEach(pb => {
      const pbs = powerBoostingSnapshots.find(
        p =>
          p.projectId === pb.projectId &&
          p.userId === pb.userId &&
          p.percentage === pb.percentage &&
          p.powerSnapshotId === snapshot?.id,
      );
      assert.isDefined(pbs);
    });
  });

  it('should return snapshot corresponding round correctly', async () => {
    await getConnection().query('truncate power_snapshot cascade');
    await takePowerBoostingSnapshot();

    let snapshot = (await PowerSnapshot.findOne()) as PowerSnapshot;
    assert.isDefined(snapshot);

    const round = getPowerBoostingSnapshotRound(snapshot as PowerSnapshot);

    const firstGivbackRoundTimeStamp = Number(
      process.env.FIRST_GIVBACK_ROUND_TIME_STAMP,
    );
    const givbackRoundLength = Number(process.env.GIVPOWER_ROUND_DURATION);

    const startBoundary =
      firstGivbackRoundTimeStamp + (round - 1) * givbackRoundLength;
    const endBoundary = startBoundary + givbackRoundLength;
    const snapshotTime = (snapshot.time.getTime() as number) / 1000;
    assert.isAtLeast(snapshotTime, startBoundary);
    assert.isBelow(snapshotTime, endBoundary);

    snapshot.roundNumber = round;
    await snapshot.save();
    snapshot = (await PowerSnapshot.findOne()) as PowerSnapshot;
    assert.equal(snapshot.roundNumber, round);
  });
}
