import { expect } from 'chai';
import axios from 'axios';
import {
  refreshProjectUserInstantPowerView,
  saveOrUpdateInstantPowerBalances,
} from '../repositories/instantBoostingRepository';
import { InstantPowerBalance } from '../entities/instantPowerBalance';
import {
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { PowerBoosting } from '../entities/powerBoosting';
import { insertSinglePowerBoosting } from './../repositories/powerBoostingRepository';
import { getProjectUserInstantPowerQuery } from '../../test/graphqlQueries';
import { User } from '../entities/user';
import { Project } from '../entities/project';

describe(
  'projectUserInstantPowerView test cases',
  projectUserInstantPowerViewTest,
);

function projectUserInstantPowerViewTest() {
  let project1: Project;
  let project2: Project;
  let project3: Project;

  let user1: User;
  let user2: User;
  let user3: User;
  let user4: User;

  before(async () => {
    await PowerBoosting.clear();
    await InstantPowerBalance.clear();

    project1 = await saveProjectDirectlyToDb(createProjectData());
    project2 = await saveProjectDirectlyToDb(createProjectData());
    project3 = await saveProjectDirectlyToDb(createProjectData());
    user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user2 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user3 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());
    user4 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    await saveOrUpdateInstantPowerBalances([
      {
        userId: user1.id,
        balanceAggregatorUpdatedAt: new Date(100_000),
        balance: 1000,
      },
      {
        userId: user2.id,
        balanceAggregatorUpdatedAt: new Date(200_000),
        balance: 2000,
      },
      {
        userId: user3.id,
        balanceAggregatorUpdatedAt: new Date(300_000),
        balance: 3000,
      },
      {
        userId: user4.id,
        balanceAggregatorUpdatedAt: new Date(400_000),
        balance: 4000,
      },
    ]);

    await Promise.all(
      [
        // user 1
        { user: user1, project: project1, percentage: 50 }, // 500
        { user: user1, project: project2, percentage: 30 }, // 300
        { user: user1, project: project3, percentage: 20 }, // 200

        // user 2
        { user: user2, project: project1, percentage: 10 }, // 200
        { user: user2, project: project2, percentage: 70 }, // 1400
        { user: user2, project: project3, percentage: 20 }, // 400

        // user 3
        { user: user3, project: project1, percentage: 80 }, // 2400
        { user: user3, project: project2, percentage: 5 }, // 150
        { user: user3, project: project3, percentage: 15 }, // 450

        // user 4
        { user: user4, project: project2, percentage: 80 }, // 3200
        { user: user4, project: project3, percentage: 20 }, // 800
      ].map(insertSinglePowerBoosting),
    );

    await refreshProjectUserInstantPowerView();
  });
  it('should return correct result ordered', async () => {
    const expectedResults = [
      {
        projectId: project1.id,
        expectedResult: [
          { userId: user3.id, boostedPower: 2400 },
          { userId: user1.id, boostedPower: 500 },
          { userId: user2.id, boostedPower: 200 },
        ],
      },
      {
        projectId: project2.id,
        expectedResult: [
          { userId: user4.id, boostedPower: 3200 },
          { userId: user2.id, boostedPower: 1400 },
          { userId: user1.id, boostedPower: 300 },
          { userId: user3.id, boostedPower: 150 },
        ],
      },
      {
        projectId: project3.id,
        expectedResult: [
          { userId: user4.id, boostedPower: 800 },
          { userId: user3.id, boostedPower: 450 },
          { userId: user2.id, boostedPower: 400 },
          { userId: user1.id, boostedPower: 200 },
        ],
      },
    ];

    for (const { projectId, expectedResult } of expectedResults) {
      const result = await axios.post(graphqlUrl, {
        query: getProjectUserInstantPowerQuery,
        variables: { projectId: +projectId, take: 10, skip: 0 },
      });
      const { projectUserInstantPowers, total } =
        result.data.data.getProjectUserInstantPower;
      expect(total).equal(expectedResult.length);
      expect(projectUserInstantPowers).length(expectedResult.length);
      expect(
        projectUserInstantPowers.map(({ userId, boostedPower }) => {
          return { userId, boostedPower };
        }),
      ).deep.equal(expectedResult);
    }
  });

  it('should return correct result ordered with pagination', async () => {
    const result = await axios.post(graphqlUrl, {
      query: getProjectUserInstantPowerQuery,
      variables: { projectId: +project3.id, take: 2, skip: 0 },
    });
    const { projectUserInstantPowers, total } =
      result.data.data.getProjectUserInstantPower;
    expect(total).equal(4);
    expect(projectUserInstantPowers).length(2);
    expect(
      projectUserInstantPowers.map(({ userId, boostedPower }) => {
        return { userId, boostedPower };
      }),
    ).deep.equal([
      { userId: user4.id, boostedPower: 800 },
      { userId: user3.id, boostedPower: 450 },
    ]);

    const result2 = await axios.post(graphqlUrl, {
      query: getProjectUserInstantPowerQuery,
      variables: { projectId: +project3.id, take: 2, skip: 2 },
    });
    const {
      projectUserInstantPowers: projectUserInstantPowers2,
      total: total2,
    } = result2.data.data.getProjectUserInstantPower;
    expect(total2).equal(4);
    expect(projectUserInstantPowers2).length(2);
    expect(
      projectUserInstantPowers2.map(({ userId, boostedPower }) => {
        return { userId, boostedPower };
      }),
    ).deep.equal([
      { userId: user2.id, boostedPower: 400 },
      { userId: user1.id, boostedPower: 200 },
    ]);
  });

  it('should return user information correctly', async () => {
    user1.avatar = 'avatar1';
    user2.avatar = 'avatar2';
    user3.avatar = 'avatar3';
    user4.avatar = 'avatar4';

    await User.save([user1, user2, user3, user4]);

    const result = await axios.post(graphqlUrl, {
      query: getProjectUserInstantPowerQuery,
      variables: { projectId: +project3.id },
    });

    const { projectUserInstantPowers } =
      result.data.data.getProjectUserInstantPower;

    const expectedUsers = [user4, user3, user2, user1];
    expect(projectUserInstantPowers.map(({ user }) => user)).deep.equal(
      expectedUsers.map(({ name, walletAddress, avatar }) => ({
        name,
        walletAddress,
        avatar,
      })),
    );
  });
}
