import { getPowerBalanceAggregatorAdapter } from '../adapters/adaptersFactory';
import {
  getMaxFetchedUpdatedAtTimestamp,
  getUsersBoostedWithoutInstanceBalance,
  refreshProjectInstantPowerView,
  saveOrUpdateInstantPowerBalances,
  setMaxFetchedUpdatedAtTimestamp,
} from '../repositories/instantBoostingRepository';
import { logger } from '../utils/logger';
import { getBoosterUsersByWalletAddresses } from '../repositories/powerBoostingRepository';
import { dateToTimestampMs } from '../utils/utils';
import { InstantPowerBalance } from '../entities/instantPowerBalance';
import {
  BalanceResponse,
  IGivPowerBalanceAggregator,
} from '../types/GivPowerBalanceAggregator';

export const updateInstantBoosting = async (): Promise<void> => {
  logger.debug('updateInstantBoosting() has been called');
  try {
    await updateInstantPowerBalances();
  } catch (e) {
    logger.error(
      'updateInstantBoosting() calling updateInstantPowerBalances() error',
      e,
    );
  }
  await refreshProjectInstantPowerView();
  // await refreshProjectUserInstantPowerView();
};

// Allow passing a custom subgraph adapter for testing purposes
export const updateInstantPowerBalances = async (
  customGivPowerBalanceAggregator?: IGivPowerBalanceAggregator,
): Promise<void> => {
  logger.debug('Update instant power balances...');
  const givPowerSubgraphAdapter =
    customGivPowerBalanceAggregator || getPowerBalanceAggregatorAdapter();
  await fetchUpdatedInstantPowerBalances(givPowerSubgraphAdapter);
  await fillMissingInstantPowerBalances(givPowerSubgraphAdapter);
};

/**
 * @param givPowerBalanceAggregator subgraph adapter
 * Fetches power balances for users whose balance has been updated since last sync
 */
const fetchUpdatedInstantPowerBalances = async (
  givPowerBalanceAggregator: IGivPowerBalanceAggregator,
): Promise<void> => {
  logger.debug('1. Fetch updated instant powers');
  // Let's save it now to sync all balances till this point
  // const [latestSubgraphIndexBlock, latestSyncedBlock] = await Promise.all([
  //   givPowerBalanceAggregator.getLatestIndexedBlockInfo(),
  //   getLatestSyncedBlock(),
  // ]);
  let maxFetchedUpdatedAt = await getMaxFetchedUpdatedAtTimestamp();

  // logger.debug(`Latest subgraph indexed block: ${latestSubgraphIndexBlock}`);
  // logger.debug(`Latest synced block: ${latestSyncedBlock}`);

  let counter = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const balances =
      await givPowerBalanceAggregator.getBalancesUpdatedAfterDate({
        date: maxFetchedUpdatedAt,
        take: 1000,
        skip: counter,
      });

    if (balances.length === 0) break;

    const addressBalanceMap: Record<string, BalanceResponse> = {};
    balances.forEach(b => {
      addressBalanceMap[b.address.toLowerCase()] = b;
    });

    const boosterUsers = await getBoosterUsersByWalletAddresses(
      balances.map(b => b.address.toLowerCase()),
    );
    const instances = boosterUsers.map(user => {
      const walletAddress = user.walletAddress!.toLowerCase();
      const { balance, updatedAt } = addressBalanceMap[walletAddress];
      logger.debug(
        `Update user ${user.id} - ${walletAddress} instant power balance to ${balance} - updateAt ${updatedAt}`,
      );
      return {
        balance,
        balanceAggregatorUpdatedAt: updatedAt,
        userId: user.id,
      };
    });
    await saveOrUpdateInstantPowerBalances(instances);
    const _maxFetchedUpdatedAt = dateToTimestampMs(
      balances[balances.length - 1].updatedAt,
    );

    if (balances.length < 1000) {
      maxFetchedUpdatedAt = _maxFetchedUpdatedAt;
      break;
    } else {
      if (_maxFetchedUpdatedAt <= maxFetchedUpdatedAt) {
        logger.error(
          `maxFetchedUpdatedAt is not increasing maxFetchedUpdatedAt: ${maxFetchedUpdatedAt}, _maxFetchedUpdatedAt: ${_maxFetchedUpdatedAt}`,
        );
        counter += balances.length;
      } else {
        // We will skip pagination and fetch 1000 again to avoid edge case issues
        // https://github.com/Giveth/impact-graph/issues/1094#issue-1844862318
        maxFetchedUpdatedAt = _maxFetchedUpdatedAt - 1;
        counter = 0;
      }
    }
  }

  // Set synced block number to latest indexed block number
  await setMaxFetchedUpdatedAtTimestamp(maxFetchedUpdatedAt);
};

/**
 * @param givPowerSubgraphAdapter subgraph adapter
 * Fetches power balances of users who has boosted but their balances are not in db
 */
const fillMissingInstantPowerBalances = async (
  givPowerSubgraphAdapter: IGivPowerBalanceAggregator,
): Promise<void> => {
  logger.debug('2. Fetch missing instant powers');
  // const latestSyncedBlock = await getMaxFetchedUpdatedAtTimestamp();
  // if (!latestSyncedBlock.timestamp) {
  //   logger.error(
  //     'No latest block number found in db, cannot fetch missing balances\nAborting...',
  //   );
  //   return;
  // }
  //
  let allUsersWithoutBalance: { id: number; walletAddress: string }[] = [];
  let counter = 0;
  // eslint-disable-next-line no-constant-condition
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
    const balances: BalanceResponse[] =
      await givPowerSubgraphAdapter.getLatestBalances({
        addresses: chunk.map(user => user!.walletAddress.toLowerCase()),
      });

    const addressBalanceMap: Record<string, BalanceResponse> = {};
    balances.forEach(b => {
      addressBalanceMap[b.address.toLowerCase()] = b;
    });

    const instances: Partial<InstantPowerBalance>[] = chunk.map<
      Partial<InstantPowerBalance>
    >((item): Partial<InstantPowerBalance> => {
      const { balance, updatedAt } = addressBalanceMap[item.walletAddress];
      logger.debug(
        `Update user ${item.id} - ${item.walletAddress} instant power balance to ${balance} - updateAt ${updatedAt}`,
      );
      return {
        balance,
        balanceAggregatorUpdatedAt: updatedAt,
        userId: item.id,
      };
    });
    await saveOrUpdateInstantPowerBalances(instances);
  }
};
