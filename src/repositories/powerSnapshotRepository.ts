import { PowerSnapshot } from '../entities/powerSnapshot';
import { AppDataSource } from '../orm';

export const updatePowerSnapShots = async (params: {
  roundNumber: number;
  powerSnapshot: PowerSnapshot;
}): Promise<void> => {
  const { roundNumber, powerSnapshot } = params;
  powerSnapshot.roundNumber = roundNumber;
  await powerSnapshot.save();
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
    time: Date;
    powerSnapshotId: number;
    walletAddress: string;
  }[]
> => {
  return await AppDataSource.getDataSource().query(
    `
        select "userId", "powerSnapshotId", "walletAddress", "time"
        from public."power_balance_snapshot" as balanceSnapshot
        inner join public."user" as "user" on  "userId"= "user".id
        inner join power_snapshot as "snapshot" on balanceSnapshot."powerSnapshotId" = snapshot.id
        where balanceSnapshot.balance is null
        order by "powerSnapshotId", "userId" 
        LIMIT $1
        OFFSET $2
  `,
    [limit, offset],
  );
};

export const updatePowerSnapshotSyncedFlag = async (): Promise<number> => {
  const result = await AppDataSource.getDataSource().query(
    `
        update power_snapshot as "snapshot" set synced = true
        where
        "snapshot"."synced" is not true and
        not exists (
          select id
          from power_balance_snapshot
          where "powerSnapshotId" = snapshot.id and "balance" is null
        )`,
  );
  return result[1];
};
