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
    const firstUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const secondUser = await saveUserDirectlyToDb(
      generateRandomEtheriumAddress(),
    );
    const project = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project,
      percentage: 10,
    });
    await insertSinglePowerBoosting({
      user: secondUser,
      project,
      percentage: 15,
    });

    const roundNumber = project.id * 10;

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [firstUser, secondUser],
      averagePowers: {
        [firstUser.walletAddress as string]: 9999.9999,
        [secondUser.walletAddress as string]: 200,
      },
    });

    await setPowerRound(roundNumber);

    let [projectPowers, count] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 0);
    assert.equal(count, 0);

    await refreshUserProjectPowerView();
    [projectPowers, count] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 2);
    assert.equal(count, 2);
    assert.isTrue(
      projectPowers[0].boostedPower > projectPowers[1].boostedPower,
    );
  });

  it('should set correct power amount for different users', async () => {
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

    await refreshUserProjectPowerView();
    const [projectPowers] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project1.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });
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
    const roundNumber = project1.id * 10;

    await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
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
    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber + 1,
      users: [user1],
      averagePowers: {
        [user1.walletAddress as string]: 20000,
      },
    });

    await setPowerRound(roundNumber);
    await refreshUserProjectPowerView();

    let [projectPowers] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project1.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 1);

    let user1power = projectPowers.find(p => p.userId === user1.id);

    assert.isDefined(user1power);
    expect(user1power?.boostedPower).to.be.closeTo((10 * 10000) / 100, 0.00001);

    await setPowerRound(roundNumber + 1);
    await refreshUserProjectPowerView();

    [projectPowers] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project1.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });
    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 1);

    user1power = projectPowers.find(p => p.userId === user1.id);
    assert.isDefined(user1power);
    expect(user1power?.boostedPower).to.be.closeTo((10 * 20000) / 100, 0.00001);
  });

  it('should change power amount by boost change', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const roundNumber = project1.id * 10;

    const powerBoosting = await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
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
    await refreshUserProjectPowerView();

    let [projectPowers] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project1.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });
    let user1power = projectPowers.find(p => p.userId === user1.id);

    assert.isDefined(user1power);
    expect(user1power?.boostedPower).to.be.closeTo((10 * 10000) / 100, 0.00001);

    powerBoosting.percentage = 90;
    await powerBoosting.save();

    await refreshUserProjectPowerView();

    [projectPowers] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project1.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });
    user1power = projectPowers.find(p => p.userId === user1.id);
    expect(user1power?.boostedPower).to.be.closeTo((90 * 10000) / 100, 0.00001);
  });

  it('should set rank correctly', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project1.id * 10;

    const user1boost = await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    const user2boost = await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 20,
    });
    const user3boost = await insertSinglePowerBoosting({
      user: user3,
      project: project1,
      percentage: 30,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user1, user2, user3],
      averagePowers: {
        [user1.walletAddress as string]: 10000,
        [user2.walletAddress as string]: 20000,
        [user3.walletAddress as string]: 30000,
      },
    });
    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();
    let [projectPowers] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project1.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });

    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 3);

    assert.deepEqual(
      projectPowers.map(p => p.userId),
      [user3.id, user2.id, user1.id],
    );

    projectPowers.forEach((p, i) => {
      assert.equal(p.rank, i + 1);
    });

    /// Change boosts and see the rank change

    user1boost.percentage = 30;
    user3boost.percentage = 10;

    await user1boost.save();
    await user3boost.save();
    await refreshUserProjectPowerView();

    [projectPowers] = await getUserProjectPowers({
      take: 20,
      skip: 0,
      projectId: project1.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });

    assert.equal(projectPowers[0].userId, user2.id); // 4000
    assert.equal(projectPowers[0].rank, 1);

    assert.includeMembers(
      projectPowers.slice(1).map(p => p.userId),
      [user1.id, user3.id],
    );

    assert.equal(projectPowers[1].rank, 2); // 3000
    assert.equal(projectPowers[2].rank, 2); // 3000
  });

  it('should set rank correctly - pagination', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    const user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project1.id * 10;

    const user1boost = await insertSinglePowerBoosting({
      user: user1,
      project: project1,
      percentage: 10,
    });
    const user2boost = await insertSinglePowerBoosting({
      user: user2,
      project: project1,
      percentage: 20,
    });
    const user3boost = await insertSinglePowerBoosting({
      user: user3,
      project: project1,
      percentage: 30,
    });

    await insertNewUserPowers({
      fromTimestamp: new Date(),
      toTimestamp: new Date(),
      givbackRound: roundNumber,
      users: [user1, user2, user3],
      averagePowers: {
        [user1.walletAddress as string]: 10000,
        [user2.walletAddress as string]: 20000,
        [user3.walletAddress as string]: 30000,
      },
    });
    await setPowerRound(roundNumber);

    await refreshUserProjectPowerView();
    const [projectPowers] = await getUserProjectPowers({
      take: 1,
      skip: 2,
      projectId: project1.id,
      orderBy: {
        field: 'boostedPower',
        direction: 'DESC',
      },
    });

    assert.isArray(projectPowers);
    assert.lengthOf(projectPowers, 1);

    assert.equal(projectPowers[0].userId, user1.id);
    assert.equal(projectPowers[0].rank, 3);
  });
});
