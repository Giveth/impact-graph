import { PowerSnapshot } from '../entities/powerSnapshot';
import { getConnection } from 'typeorm';
import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';
import { logger } from '../utils/logger';

export const findInCompletePowerSnapShots = async (): Promise<
  PowerSnapshot[]
> => {
  return PowerSnapshot.createQueryBuilder()
    .where('"blockNumber" IS NULL')
    .getMany();
};

export const updatePowerSnapShots = async (params: {
  blockNumber: number;
  roundNumber: number;
  powerSnapshot: PowerSnapshot;
}): Promise<void> => {
  const { blockNumber, roundNumber, powerSnapshot } = params;
  powerSnapshot.blockNumber = blockNumber;
  powerSnapshot.roundNumber = roundNumber;
  await powerSnapshot.save();
};

export const insertSinglePowerBalanceSnapshot = async (
  param: Pick<PowerBalanceSnapshot, 'userId' | 'powerSnapshotId' | 'balance'>,
) => {
  return PowerBalanceSnapshot.create(param).save();
};

export const findPowerSnapshots = async (
  round?: number,
  powerSnapshotId?: number,
  take: number = 100,
  skip: number = 0,
) => {
  const query = PowerSnapshot.createQueryBuilder('powerSnapshot');

  if (round && !powerSnapshotId) {
    query.where('powerSnapshot.roundNumber = :round', { round });
  } else if (!round && powerSnapshotId) {
    query.where('powerSnapshot.id = :id', { id: powerSnapshotId });
  } else if (round && powerSnapshotId) {
    query
      .where('powerSnapshot.id = :id', { id: powerSnapshotId })
      .andWhere('powerSnapshot.roundNumber = :round', { round });
  }

  return query.take(take).skip(skip).getManyAndCount();
};

export const getPowerBoostingSnapshotWithoutBalance = async (
  limit = 50,
  offset = 0,
): Promise<
  {
    userId: number;
    powerSnapshotId: number;
    blockNumber: number;
    walletAddress: string;
  }[]
> => {
  logger.info('getPowerBoostingSnapshotWithoutBalance()', { limit, offset });
  return await getConnection().query(
    `
        select "userId", "powerSnapshotId", "blockNumber","walletAddress"
        from (select DISTINCT "powerSnapshotId", "userId" from power_boosting_snapshot) as boosting
        inner join public."user" as "user" on  "userId"= "user".id
        inner join power_snapshot as "snapshot" on boosting."powerSnapshotId" = snapshot.id
        where snapshot."blockNumber" is not NULL
        and not exists (
          select
          from power_balance_snapshot as "balance"
          where balance."powerSnapshotId" = boosting."powerSnapshotId" and
          balance."userId" = boosting."userId"
        )
        order by "blockNumber" ASC
        LIMIT $1
        OFFSET $2
  `,
    [limit, offset],
  );
};

export const updatePowerSnapshotSyncedFlag = async (): Promise<number> => {
  const result = await getConnection().query(
    `
        update power_snapshot as "snapshot" set synced = true
        where
        "snapshot"."blockNumber" is not NULL and
        "snapshot"."synced" is not true and
        not exists (
          select "userId", "powerSnapshotId", "blockNumber","walletAddress"
          from (select DISTINCT "powerSnapshotId", "userId" from power_boosting_snapshot) as boosting
          inner join public."user" as "user" on  "userId"= "user".id
          where boosting."powerSnapshotId" = snapshot.id
          and not exists (
              select
              from power_balance_snapshot as "balance"
              where balance."powerSnapshotId" = boosting."powerSnapshotId" and
              balance."userId" = boosting."userId"
            )
        )`,
  );
  return result[1];
};
