import { assert, expect } from 'chai';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { insertSinglePowerBoosting } from './powerBoostingRepository';
import { insertNewUserPowers } from './userPowerRepository';
import { setPowerRound } from './powerRoundRepository';
import {
  getProjectPowers,
  refreshProjectPowerView,
} from './projectPowerViewRepository';

describe('projectPowerViewRepository test', () => {
  it('should not be filled till refresh', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData());
    const roundNumber = project.id * 10;

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();

    await insertSinglePowerBoosting({
      user,
      project,
      percentage: 10,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user],
      averagePowers: { [user.walletAddress as string]: 9999.9999 },
    });

    let projectPowers = await getProjectPowers();
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 0);

    await refreshProjectPowerView();
    projectPowers = await getProjectPowers(project.id);
    assert.isArray(projectPowers);
    assert.isTrue(projectPowers.length > 0);
  });

  it('should not change updateAt time without refresh', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const roundNumber = project1.id * 10;

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();
    const beforeTime = Date.now();

    await insertSinglePowerBoosting({
      user,
      project: project1,
      percentage: 10,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user],
      averagePowers: { [user.walletAddress as string]: 9999.9999 },
    });

    await refreshProjectPowerView();
    let projectPowers = await getProjectPowers(project1.id);
    assert.isArray(projectPowers);
    assert.isTrue(projectPowers.length > 0);

    const firstDate = projectPowers[0].updateTime;
    assert.isAbove(firstDate.getTime(), beforeTime);

    await insertSinglePowerBoosting({
      user,
      project: project2,
      percentage: 20,
    });

    projectPowers = await getProjectPowers(project1.id);
    assert.equal(projectPowers[0].updateTime.getTime(), firstDate.getTime());

    await refreshProjectPowerView();
    projectPowers = await getProjectPowers(project1.id);
    assert.isAbove(projectPowers[0].updateTime.getTime(), firstDate.getTime());
  });

  it('should set correct power amount', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const roundNumber = project1.id * 10;

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 20,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user1, user2],
      averagePowers: {
        [user1.walletAddress as string]: 10000,
        [user2.walletAddress as string]: 20000,
      },
    });
    await setPowerRound(roundNumber);

    await refreshProjectPowerView();
    const projectPowers = await getProjectPowers(project1.id + 1);
    assert.isArray(projectPowers);

    const project1power = projectPowers.find(p => p.projectId === project1.id);

    assert.isDefined(project1power);

    expect(project1power?.totalPower).to.be.closeTo(
      (10 * 10000 + 20 * 20000) / 100,
      0.00001,
    );
  });

  it('should return descending ordered', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project2.id * 10;

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project2,
      percentage: 20,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 20,
    });
    await insertSinglePowerBoosting({
      user: user2,
      project: project2,
      percentage: 40,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user1, user2],
      averagePowers: {
        [user1.walletAddress as string]: 10000,
        [user2.walletAddress as string]: 20000,
      },
    });
    await setPowerRound(roundNumber);
    await refreshProjectPowerView();

    const projectPowers = await getProjectPowers(project1.id + 1);

    const totalPowers = projectPowers.map(p => p.totalPower);
    assert.deepEqual(
      totalPowers,
      [...totalPowers].sort((a, b) => a - b).reverse(),
    );
  });

  it('should return correct rank', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());
    const project4 = await saveProjectDirectlyToDb(createProjectData());
    const project5 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project5.id * 10;

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project2,
      percentage: 20,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project3,
      percentage: 20,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project4,
      percentage: 5,
    });
    await insertSinglePowerBoosting({
      user: user1,
      project: project5,
      percentage: 5,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user1],
      averagePowers: {
        [user1.walletAddress as string]: 10000,
      },
    });
    await setPowerRound(roundNumber);
    await refreshProjectPowerView();

    const projectPowers = await getProjectPowers(project5.id + 1);

    assert.equal(projectPowers[0].powerRank, 1);
    assert.equal(projectPowers[1].powerRank, 1); // Two projects have the same rank
    assert.equal(projectPowers[2].powerRank, 3);
    assert.equal(projectPowers[3].powerRank, 4);
    assert.equal(projectPowers[4].powerRank, 4);
  });
});
