import { PowerBoosting } from '../entities/powerBoosting';
import { InstantPowerBalance } from '../entities/instantPowerBalance';
import { updateInstantPowerBalances } from './instantBoostingServices';
import { InstantPowerFetchState } from '../entities/instantPowerFetchState';
import { expect } from 'chai';
import {
  getLatestSyncedBlock,
  saveOrUpdateInstantPowerBalances,
  setLatestSyncedBlock,
} from '../repositories/instantBoostingRepository';
import { insertSinglePowerBoosting } from '../repositories/powerBoostingRepository';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';
import { givPowerSubgraphAdapter } from '../adapters/adaptersFactory';
import axios from 'axios';
import { formatGivPowerBalance } from '../adapters/givpowerSubgraph/givPowerSubgraphAdapter';

describe(
  'updateInstancePowerBalances test cases',
  updateInstancePowerBalancesTestCase,
);

const SampleStagingGivPowerUsers = [
  '0x00d18ca9782be1caef611017c2fbc1a39779a57c',
  '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c',
];

const getLastUpdatedUsers = async (
  take: number,
): Promise<[{ user: { id: string }; updatedAt: string; balance: string }]> => {
  const givPowerSubgraphUrl = process.env.GIV_POWER_SUBGRAPH_URL as string;
  const unipoolContractId = process.env.GIV_POWER_UNIPOOL_CONTRACT_ID as string;
  const query = `
    {
      unipoolBalances(
        first: ${take}
        orderBy: updatedAt
        orderDirection: desc
        where: {unipool: "${unipoolContractId.toLowerCase()}"}
      ) {
        balance
        updatedAt
        user {
          id
        }
      }
    }`;
  const response = await axios.post(givPowerSubgraphUrl, { query });
  return response.data.data.unipoolBalances;
};

function updateInstancePowerBalancesTestCase() {
  beforeEach(async () => {
    await Promise.all([
      PowerBoosting.clear(),
      InstantPowerBalance.clear(),
      InstantPowerFetchState.clear(),
    ]);
  });

  it('should not throw error on intact data', async () => {
    await updateInstantPowerBalances();
  });

  it('should update latest synced block', async () => {
    await updateInstantPowerBalances();
    const latestSyncedBlock = await getLatestSyncedBlock();
    expect(latestSyncedBlock.number).to.be.greaterThan(0);
    expect(latestSyncedBlock.timestamp).to.be.greaterThan(0);
  });

  it('should fill missing instant power balances of only boosters', async () => {
    const firstUser = await saveUserDirectlyToDb(SampleStagingGivPowerUsers[0]);
    // Second User
    await saveUserDirectlyToDb(SampleStagingGivPowerUsers[1]);

    const firstProject = await saveProjectDirectlyToDb(createProjectData());
    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });

    await updateInstantPowerBalances();

    // Only the first user should have an instant power balance
    const instantBalances = await InstantPowerBalance.find();
    expect(instantBalances.length).to.equal(1);
    expect(instantBalances[0].userId).to.equal(firstUser.id);
    expect(instantBalances[0].chainUpdatedAt).greaterThan(0);
  });

  it('should update instant power balances', async () => {
    const lastUpdatedUsers = await getLastUpdatedUsers(1);
    /// Get last updated user
    const [firstUser, firstProject] = await Promise.all([
      saveUserDirectlyToDb(lastUpdatedUsers[0].user.id),
      saveProjectDirectlyToDb(createProjectData()),
    ]);

    await insertSinglePowerBoosting({
      user: firstUser,
      project: firstProject,
      percentage: 2,
    });

    const beforeUpdateTimestamp = Number(lastUpdatedUsers[0].updatedAt) - 1;
    // Let's save last sync state some time behind user's last update time
    await setLatestSyncedBlock({
      number: 1,
      timestamp: beforeUpdateTimestamp,
    });

    // Set save firstUser instance power balance with incorrect value
    await saveOrUpdateInstantPowerBalances([
      {
        userId: firstUser.id,
        balance: 0,
        chainUpdatedAt: beforeUpdateTimestamp,
      },
    ]);

    await updateInstantPowerBalances(givPowerSubgraphAdapter);

    const instantBalances = await InstantPowerBalance.find();
    expect(instantBalances.length).to.equal(1);
    const newBalance = instantBalances[0];
    expect(newBalance.userId).to.equal(firstUser.id);
    expect(newBalance.balance).equal(
      formatGivPowerBalance(lastUpdatedUsers[0].balance),
    );
    expect(newBalance.chainUpdatedAt).eq(+lastUpdatedUsers[0].updatedAt);
  });

  it('should update and create instant power balances', async () => {
    const lastUpdatedUsers = await getLastUpdatedUsers(1);

    const userToUpdateUnipoolBalanceInfo = lastUpdatedUsers[0];
    const userToCreateWalletAddress =
      SampleStagingGivPowerUsers[0] !== userToUpdateUnipoolBalanceInfo.user.id
        ? SampleStagingGivPowerUsers[0]
        : SampleStagingGivPowerUsers[1];
    /// Get last updated user
    const [firstUser, secondUser, firstProject] = await Promise.all([
      saveUserDirectlyToDb(userToUpdateUnipoolBalanceInfo.user.id),
      saveUserDirectlyToDb(userToCreateWalletAddress),
      saveProjectDirectlyToDb(createProjectData()),
    ]);

    const beforeUpdateTimestamp = +userToUpdateUnipoolBalanceInfo.updatedAt - 1;

    await Promise.all([
      insertSinglePowerBoosting({
        user: firstUser,
        project: firstProject,
        percentage: 2,
      }),
      insertSinglePowerBoosting({
        user: secondUser,
        project: firstProject,
        percentage: 2,
      }),

      // Let's save last sync state some time behind user's last update time
      setLatestSyncedBlock({
        number: 1,
        timestamp: beforeUpdateTimestamp,
      }),

      // Set save firstUser instance power balance with incorrect value
      saveOrUpdateInstantPowerBalances([
        {
          userId: firstUser.id,
          balance: 0,
          chainUpdatedAt: beforeUpdateTimestamp,
        },
      ]),
    ]);

    await updateInstantPowerBalances(givPowerSubgraphAdapter);

    const instantBalances = await InstantPowerBalance.find();
    expect(instantBalances.length).to.equal(2);
    const firstUserUpdatedInstantPower = instantBalances.find(
      balance => balance.userId === firstUser.id,
    );
    expect(firstUserUpdatedInstantPower?.userId).to.equal(firstUser.id);
    expect(firstUserUpdatedInstantPower?.balance).equal(
      formatGivPowerBalance(userToUpdateUnipoolBalanceInfo.balance),
    );
    expect(firstUserUpdatedInstantPower?.chainUpdatedAt).eq(
      +userToUpdateUnipoolBalanceInfo.updatedAt,
    );

    const newBalance2 = instantBalances.find(
      balance => balance.userId === secondUser.id,
    );
    expect(newBalance2?.userId).to.equal(secondUser.id);
    expect(newBalance2?.chainUpdatedAt).greaterThan(0);
  });
}
