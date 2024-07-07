import { expect } from 'chai';
import { PowerBoosting } from '../entities/powerBoosting';
import { InstantPowerBalance } from '../entities/instantPowerBalance';
import { updateInstantPowerBalances } from './instantBoostingServices';
import { InstantPowerFetchState } from '../entities/instantPowerFetchState';
import { getMaxFetchedUpdatedAtTimestamp } from '../repositories/instantBoostingRepository';
import { insertSinglePowerBoosting } from '../repositories/powerBoostingRepository';
import {
  createProjectData,
  saveProjectDirectlyToDb,
  saveUserDirectlyToDb,
} from '../../test/testUtils';

describe(
  'updateInstancePowerBalances test cases',
  updateInstancePowerBalancesTestCase,
);

const SampleStagingGivPowerUsers = [
  '0x00d18ca9782be1caef611017c2fbc1a39779a57c',
  '0x05a1ff0a32bc24265bcb39499d0c5d9a6cb2011c',
];

// const getLastUpdatedUsers = async (): Promise<BalanceResponse[]> => {
//   return mockPowerBalanceAggregator.getBalancesUpdatedAfterDate({
//     date: 0,
//   });
// };

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
    const maxTimestamp = await getMaxFetchedUpdatedAtTimestamp();
    expect(maxTimestamp).to.be.greaterThan(0);
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
    expect(instantBalances[0].balanceAggregatorUpdatedAt).greaterThan(
      new Date(0),
    );
  });

  /**
   This test doesn't work because of the way we are mocking the adapter
    */
  // it('should update instant power balances', async () => {
  //   const lastUpdatedUsers = await getLastUpdatedUsers();
  //   /// Get last updated user
  //   const [firstUser, firstProject] = await Promise.all([
  //     saveUserDirectlyToDb(lastUpdatedUsers[0].address),
  //     saveProjectDirectlyToDb(createProjectData()),
  //   ]);
  //
  //   await insertSinglePowerBoosting({
  //     user: firstUser,
  //     project: firstProject,
  //     percentage: 2,
  //   });
  //
  //   const beforeUpdateTimestamp = Number(lastUpdatedUsers[0].updatedAt) - 1;
  //   // Let's save last sync state some time behind user's last update time
  //   await setMaxFetchedUpdatedAtTimestamp(beforeUpdateTimestamp);
  //
  //   // Set save firstUser instance power balance with incorrect value
  //   await saveOrUpdateInstantPowerBalances([
  //     {
  //       userId: firstUser.id,
  //       balance: 0,
  //       balanceAggregatorUpdatedAt: new Date(beforeUpdateTimestamp),
  //     },
  //   ]);
  //
  //   await updateInstantPowerBalances(mockPowerBalanceAggregator);
  //
  //   const instantBalances = await InstantPowerBalance.find();
  //   expect(instantBalances.length).to.equal(1);
  //   const newBalance = instantBalances[0];
  //   expect(newBalance.userId).to.equal(firstUser.id);
  //   expect(newBalance.balance).equal(
  //     formatGivPowerBalance(lastUpdatedUsers[0].balance),
  //   );
  //   expect(newBalance.balanceAggregatorUpdatedAt).eq(
  //     lastUpdatedUsers[0].updatedAt,
  //   );
  // });
  //
  // it('should update and create instant power balances', async () => {
  //   const lastUpdatedUsers = await getLastUpdatedUsers();
  //
  //   const userToUpdateUnipoolBalanceInfo = lastUpdatedUsers[0];
  //   const userToCreateWalletAddress =
  //     SampleStagingGivPowerUsers[0] !== userToUpdateUnipoolBalanceInfo.address
  //       ? SampleStagingGivPowerUsers[0]
  //       : SampleStagingGivPowerUsers[1];
  //   /// Get last updated user
  //   const [firstUser, secondUser, firstProject] = await Promise.all([
  //     saveUserDirectlyToDb(userToUpdateUnipoolBalanceInfo.address),
  //     saveUserDirectlyToDb(userToCreateWalletAddress),
  //     saveProjectDirectlyToDb(createProjectData()),
  //   ]);
  //
  //   const beforeUpdateTimestamp =
  //     dateToTimestampMs(userToUpdateUnipoolBalanceInfo.updatedAt) - 1;
  //
  //   await Promise.all([
  //     insertSinglePowerBoosting({
  //       user: firstUser,
  //       project: firstProject,
  //       percentage: 2,
  //     }),
  //     insertSinglePowerBoosting({
  //       user: secondUser,
  //       project: firstProject,
  //       percentage: 2,
  //     }),
  //
  //     // Let's save last sync state some time behind user's last update time
  //     setMaxFetchedUpdatedAtTimestamp(beforeUpdateTimestamp),
  //
  //     // Set save firstUser instance power balance with incorrect value
  //     saveOrUpdateInstantPowerBalances([
  //       {
  //         userId: firstUser.id,
  //         balance: 0,
  //         balanceAggregatorUpdatedAt: new Date(beforeUpdateTimestamp),
  //       },
  //     ]),
  //   ]);
  //
  //   await updateInstantPowerBalances(mockPowerBalanceAggregator);
  //
  //   const instantBalances = await InstantPowerBalance.find();
  //   expect(instantBalances.length).to.equal(2);
  //   const firstUserUpdatedInstantPower = instantBalances.find(
  //     balance => balance.userId === firstUser.id,
  //   );
  //   expect(firstUserUpdatedInstantPower?.userId).to.equal(firstUser.id);
  //   expect(firstUserUpdatedInstantPower?.balance).equal(
  //     formatGivPowerBalance(userToUpdateUnipoolBalanceInfo.balance),
  //   );
  //   expect(firstUserUpdatedInstantPower?.balanceAggregatorUpdatedAt).eq(
  //     userToUpdateUnipoolBalanceInfo.updatedAt,
  //   );
  //
  //   const newBalance2 = instantBalances.find(
  //     balance => balance.userId === secondUser.id,
  //   );
  //   expect(newBalance2?.userId).to.equal(secondUser.id);
  //   expect(newBalance2?.balanceAggregatorUpdatedAt).greaterThan(0);
  // });
}
