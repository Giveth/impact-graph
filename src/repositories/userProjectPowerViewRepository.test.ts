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
  getUserProjectPowers,
  refreshUserProjectPowerView,
} from './userProjectPowerViewRepository';

describe('userProjectPowerViewRepository test', () => {
  it('should not be filled till refresh', async () => {
    const user = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user,
      project,
      percentage: 10,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      users: [user],
      averagePowers: { [user.walletAddress as string]: 9999.9999 },
    });
    await setPowerRound(2);

    let projectPowers = await getUserProjectPowers(project.id);
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 0);

    await refreshUserProjectPowerView();
    projectPowers = await getUserProjectPowers(project.id);
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 1);
  });

  it('should set correct power amount for different users', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());

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
      givbackRound: 2,
      users: [user1, user2],
      averagePowers: {
        [user1.walletAddress as string]: 10000,
        [user2.walletAddress as string]: 20000,
      },
    });
    await setPowerRound(2);

    await refreshUserProjectPowerView();
    const projectPowers = await getUserProjectPowers(project1.id);
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 2);

    const user1power = projectPowers.find(p => p.userId === user1.id);
    const user2power = projectPowers.find(p => p.userId === user2.id);

    assert.isDefined(user1power);
    assert.isDefined(user2power);

    expect(user1power?.boostedPower).to.be.closeTo((10 * 10000) / 100, 0.00001);
    expect(user2power?.boostedPower).to.be.closeTo((20 * 20000) / 100, 0.00001);
  });

  it('should have correct power amount for different rounds', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 1,
      users: [user1],
      averagePowers: {
        [user1.walletAddress as string]: 10000,
      },
    });
    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 2,
      users: [user1],
      averagePowers: {
        [user1.walletAddress as string]: 20000,
      },
    });

    await setPowerRound(1);
    await refreshUserProjectPowerView();

    let projectPowers = await getUserProjectPowers(project1.id);
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 1);

    let user1power = projectPowers.find(p => p.userId === user1.id);

    assert.isDefined(user1power);
    expect(user1power?.boostedPower).to.be.closeTo((10 * 10000) / 100, 0.00001);

    await setPowerRound(2);
    await refreshUserProjectPowerView();

    projectPowers = await getUserProjectPowers(project1.id);
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 1);

    user1power = projectPowers.find(p => p.userId === user1.id);
    assert.isDefined(user1power);
    expect(user1power?.boostedPower).to.be.closeTo((10 * 20000) / 100, 0.00001);
  });

  it('should change power amount by boost change', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());

    const powerBoosting = await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: 1,
      users: [user1],
      averagePowers: {
        [user1.walletAddress as string]: 10000,
      },
    });

    await setPowerRound(1);
    await refreshUserProjectPowerView();

    let projectPowers = await getUserProjectPowers(project1.id);
    let user1power = projectPowers.find(p => p.userId === user1.id);

    assert.isDefined(user1power);
    expect(user1power?.boostedPower).to.be.closeTo((10 * 10000) / 100, 0.00001);

    powerBoosting.percentage = 90;
    await powerBoosting.save();

    await refreshUserProjectPowerView();

    projectPowers = await getUserProjectPowers(project1.id);
    user1power = projectPowers.find(p => p.userId === user1.id);
    expect(user1power?.boostedPower).to.be.closeTo((90 * 10000) / 100, 0.00001);
  });
});
