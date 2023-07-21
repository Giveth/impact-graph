import { InstantPowerBalance } from '../entities/instantPowerBalance';
import { logger } from '../utils/logger';
import { AppDataSource } from '../orm';
import { InstantPowerFetchState } from '../entities/instantPowerFetchState';
import { BlockInfo } from '../adapters/givpowerSubgraph/IGivPowerSubgraphAdapter';
import { ProjectUserInstantPowerView } from '../views/projectUserInstantPowerView';

export const saveOrUpdateInstantPowerBalances = async (
  instances: Partial<InstantPowerBalance>[],
): Promise<void> => {
  try {
    logger.debug(
      'saveOrUpdateInstantPowerBalances ',
      JSON.stringify({ instances }, null, 2),
    );

    const userIdInstanceDic = {};
    instances.forEach(instance => {
      if (!instance.userId) {
        throw new Error('userId is required for InstantPowerBalance');
      }
      userIdInstanceDic[instance.userId!] = instance;
    });

    await InstantPowerBalance.createQueryBuilder<InstantPowerBalance>()
      .insert()
      .into(InstantPowerBalance)
      .values(Object.values(userIdInstanceDic))
      .orUpdate(['balance', 'chainUpdatedAt'], ['userId'])
      .execute();
  } catch (e) {
    logger.error('saveOrUpdateInstantPowerBalances error', e);
  }
};

export const getUsersBoostedWithoutInstanceBalance = async (
  limit = 50,
  offset = 0,
): Promise<{ id: number; walletAddress: string }[]> => {
  logger.info('getUsersBoostedWithoutBalance', { limit, offset });
  return await AppDataSource.getDataSource().query(
    `
        SELECT ID, "walletAddress" FROM PUBLIC.USER
        INNER JOIN
	      (SELECT "userId"
            FROM POWER_BOOSTING AS "boosting"
            WHERE NOT EXISTS
                (SELECT
                  FROM INSTANT_POWER_BALANCE AS "balance"
                  WHERE BALANCE."userId" = BOOSTING."userId" ) ) 
        WITHOUT_BALANCE_USERS 
	          ON ID = WITHOUT_BALANCE_USERS."userId" AND "walletAddress" IS NOT NULL
        ORDER BY "id" ASC
                LIMIT $1
                OFFSET $2
  `,
    [limit, offset],
  );
};

/**
 * Sets the latest block number that instant power balances were fetched from subgraph
 * @param blockInfo {BlockInfo} block number and timestamp
 */
export const setLatestSyncedBlock = async (
  blockInfo: BlockInfo,
): Promise<InstantPowerFetchState> => {
  let state = await InstantPowerFetchState.findOne({ where: {} });

  if (!state) {
    state = InstantPowerFetchState.create({
      id: true,
      latestBlockNumber: blockInfo.number,
      latestBlockTimestamp: blockInfo.timestamp,
    });
  } else {
    state.latestBlockNumber = blockInfo.number;
    state.latestBlockTimestamp = blockInfo.timestamp;
  }
  return state.save();
};

/**
 * Returns the latest block number that instant power balances were fetched from subgraph
 * @returns {Promise<number>}
 */
export const getLatestSyncedBlock = async (): Promise<BlockInfo> => {
  const state = await InstantPowerFetchState.findOne({ where: {} });

  return {
    number: state?.latestBlockNumber || 0,
    timestamp: state?.latestBlockTimestamp || 0,
  };
};

export const refreshProjectInstantPowerView = async (): Promise<void> => {
  logger.debug('Refresh project_instant_power_view materialized view');
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_instant_power_view
    `,
  );
};

export const refreshProjectUserInstantPowerView = async (): Promise<void> => {
  logger.debug('Refresh project_user_instant_power_view materialized view');
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_user_instant_power_view
    `,
  );
};

export const getProjectUserInstantPowerView = async (
  projectId: number,
  limit = 50,
  offset = 0,
): Promise<[ProjectUserInstantPowerView[], number]> => {
  return ProjectUserInstantPowerView.createQueryBuilder(
    'projectUserInstantPowerView',
  )
    .where('projectUserInstantPowerView.projectId = :projectId', { projectId })
    .take(limit)
    .skip(offset)
    .orderBy('projectUserInstantPowerView.boostedPower', 'DESC')
    .leftJoin('projectUserInstantPowerView.user', 'user')
    .select([
      'projectUserInstantPowerView.id',
      'projectUserInstantPowerView.projectId',
      'projectUserInstantPowerView.userId',
      'projectUserInstantPowerView.boostedPower',
      'user.walletAddress',
      'user.name',
      'user.avatar',
    ])
    .getManyAndCount();
};
