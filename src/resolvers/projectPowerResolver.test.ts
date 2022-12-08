import {
  createProjectData,
  generateRandomEtheriumAddress,
  graphqlUrl,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import axios from 'axios';
import { gePowerAmountRankQuery } from '../../test/graphqlQueries';
import { assert } from 'chai';
import { getConnection } from 'typeorm';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { refreshProjectPowerView } from '../repositories/projectPowerViewRepository';
import { User } from '../entities/user';
import { Project } from '../entities/project';
import {
  insertSinglePowerBoosting,
  takePowerBoostingSnapshot,
} from '../repositories/powerBoostingRepository';
import {
  findInCompletePowerSnapShots,
  insertSinglePowerBalanceSnapshot,
} from '../repositories/powerSnapshotRepository';
import { setPowerRound } from '../repositories/powerRoundRepository';

describe('userProjectPowers test cases', projectPowersTestCases);

function projectPowersTestCases() {
  beforeEach(async () => {
    await getConnection().query('truncate power_snapshot cascade');
    await PowerBalanceSnapshot.clear();
    await PowerBoostingSnapshot.clear();
  });

  it('must return one where there is no project ranked', async () => {
    await refreshProjectPowerView();
    const result = await axios.post(graphqlUrl, {
      query: gePowerAmountRankQuery,
      variables: { powerAmount: 100 },
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 1);
  });

  it('must return correct rank', async () => {
    const user1 = await saveUserDirectlyToDb(generateRandomEtheriumAddress());

    const project1 = await saveProjectDirectlyToDb(createProjectData());
    const project2 = await saveProjectDirectlyToDb(createProjectData());
    const project3 = await saveProjectDirectlyToDb(createProjectData());

    const roundNumber = project3.id * 10;

    await Promise.all(
      [
        [user1, project1, 10], // 1000
        [user1, project2, 20], // 2000
        [user1, project3, 30], // 3000
      ].map(item => {
        const [user, project, percentage] = item as [User, Project, number];
        return insertSinglePowerBoosting({
          user,
          project,
          percentage,
        });
      }),
    );

    await takePowerBoostingSnapshot();
    const incompleteSnapshots = await findInCompletePowerSnapShots();
    const snapshot = incompleteSnapshots[0];

    snapshot.blockNumber = 1;
    snapshot.roundNumber = roundNumber;
    await snapshot.save();

    await insertSinglePowerBalanceSnapshot({
      userId: user1.id,
      powerSnapshotId: snapshot.id,
      balance: 10000,
    });

    await setPowerRound(roundNumber);
    await refreshProjectPowerView();

    // 1. Higher than all -> must return 1
    let result = await axios.post(graphqlUrl, {
      query: gePowerAmountRankQuery,
      variables: { powerAmount: 4000 },
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 1);

    // 2. Between some, must return correct rank
    result = await axios.post(graphqlUrl, {
      query: gePowerAmountRankQuery,
      variables: { powerAmount: 1500 }, // 3000, 2000, [1500], 1000
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 3);

    // 2. Lower than all
    result = await axios.post(graphqlUrl, {
      query: gePowerAmountRankQuery,
      variables: { powerAmount: 900 }, // 3000, 2000, 1000, [900]
    });

    assert.isOk(result);
    assert.equal(result.data.data.powerAmountRank, 4);
  });
}
