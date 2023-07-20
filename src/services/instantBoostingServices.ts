import { getGivPowerSubgraphAdapter } from '../adapters/adaptersFactory';
import {
  getLatestSyncedBlock,
  getUsersBoostedWithoutInstanceBalance,
  refreshProjectInstantPowerView,
  refreshProjectUserInstantPowerView,
  saveOrUpdateInstantPowerBalances,
  setLatestSyncedBlock,
} from '../repositories/instantBoostingRepository';
import { logger } from '../utils/logger';
import { getBoosterUsersByWalletAddresses } from '../repositories/powerBoostingRepository';
import { IGivPowerSubgraphAdapter } from '../adapters/givpowerSubgraph/IGivPowerSubgraphAdapter';

export const updateInstantBoosting = async (): Promise<void> => {
  logger.debug('updateInstantBoosting() has been called');
  await updateInstantPowerBalances();
  await refreshProjectInstantPowerView();
  // await refreshProjectUserInstantPowerView();
};

// Allow passing a custom subgraph adapter for testing purposes
export const updateInstantPowerBalances = async (
  customGivPowerSubgraphAdapter?: IGivPowerSubgraphAdapter,
): Promise<void> => {
  logger.info('Update instant power balances...');
  const givPowerSubgraphAdapter =
    customGivPowerSubgraphAdapter || getGivPowerSubgraphAdapter();
  await fetchUpdatedInstantPowerBalances(givPowerSubgraphAdapter);
  await fillMissingInstantPowerBalances(givPowerSubgraphAdapter);
};

/**
 * @param givPowerSubgraphAdapter subgraph adapter
 * Fetches power balances for users whose balance has been updated since last sync
 */
const fetchUpdatedInstantPowerBalances = async (
  givPowerSubgraphAdapter: IGivPowerSubgraphAdapter,
): Promise<void> => {
  logger.info('1. Fetch updated instant powers');
  // Let's save it now to sync all balances till this point
  const [latestSubgraphIndexBlock, latestSyncedBlock] = await Promise.all([
    givPowerSubgraphAdapter.getLatestIndexedBlockInfo(),
    getLatestSyncedBlock(),
  ]);

  logger.debug(`Latest subgraph indexed block: ${latestSubgraphIndexBlock}`);
  logger.debug(`Latest synced block: ${latestSyncedBlock}`);

  // Fetch balances have been updated since last sync
  let counter = 0;
  while (true) {
    const balances =
      await givPowerSubgraphAdapter.getUserPowerBalanceUpdatedAfterTimestamp({
        blockNumber: latestSubgraphIndexBlock.number,
        take: 100,
        skip: counter,
        timestamp: latestSyncedBlock.timestamp,
      });
    if (Object.keys(balances).length === 0) break;

    const boosterUsers = await getBoosterUsersByWalletAddresses(
      Object.keys(balances),
    );
    const instances = boosterUsers.map(user => {
      const walletAddress = user.walletAddress!.toLowerCase();
      const { balance, updatedAt } = balances[walletAddress];
      logger.info(
        `Update user ${user.id} - ${walletAddress} instant power balance to ${balance} - updateAt ${updatedAt}`,
      );
      return {
        balance,
        chainUpdatedAt: updatedAt,
        userId: user.id,
      };
    });
    await saveOrUpdateInstantPowerBalances(instances);
    counter += Object.keys(balances).length;
  }

  // Set synced block number to latest indexed block number
  await setLatestSyncedBlock(latestSubgraphIndexBlock);
};

/**
 * @param givPowerSubgraphAdapter subgraph adapter
 * Fetches power balances of users who has boosted but their balances are not in db
 */
const fillMissingInstantPowerBalances = async (
  givPowerSubgraphAdapter: IGivPowerSubgraphAdapter,
): Promise<void> => {
  const latestSyncedBlock = await getLatestSyncedBlock();
  if (!latestSyncedBlock.timestamp) {
    logger.error(
      'No latest block number found in db, cannot fetch missing balances\nAborting...',
    );
    return;
  }

  let allUsersWithoutBalance: { id: number; walletAddress: string }[] = [];
  let counter = 0;
  while (true) {
    const result = await getUsersBoostedWithoutInstanceBalance(100, counter);
    if (result.length === 0) break;
    allUsersWithoutBalance = [...allUsersWithoutBalance, ...result];
    counter += result.length;
  }

  // iterate over allUsersWithoutBalance in chunks of 50
  // and get their balances from subgraph
  // and save them in db
  const chunkSize = 50;

  for (let i = 0; i < allUsersWithoutBalance.length; i += chunkSize) {
    const chunk = allUsersWithoutBalance.slice(i, i + chunkSize);
    const balances =
      await givPowerSubgraphAdapter.getUserPowerBalanceAtBlockNumber({
        blockNumber: latestSyncedBlock.number,
        walletAddresses: chunk.map(user => user!.walletAddress.toLowerCase()),
      });
    const instances = chunk.map(item => {
      const { balance, updatedAt } = balances[item.walletAddress];
      logger.info(
        `Update user ${item.id} - ${item.walletAddress} instant power balance to ${balance} - updateAt ${updatedAt}`,
      );
      return {
        balance,
        chainUpdatedAt: updatedAt,
        userId: item.id,
      };
    });
    await saveOrUpdateInstantPowerBalances(instances);
  }
};
