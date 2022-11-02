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

export const findPowerSnapshotById = async (
  id: number,
): Promise<PowerSnapshot | undefined> => {
  return PowerSnapshot.createQueryBuilder()
    .where('id=:id', {
      id,
    })
    .getOne();
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
