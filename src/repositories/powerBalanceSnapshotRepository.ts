import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';

export const createPowerSnapshotBalances = async (
  params: {
    powerSnapshotId: number;
    userId: number;
    balance: number;
  }[],
): Promise<void> => {
  const powerBalanceSnapshots = PowerBalanceSnapshot.create(params);
  await PowerBalanceSnapshot.save(powerBalanceSnapshots);
};

export const findCurrentPowerBalanceByUserId = async (
  userId: number,
): Promise<number> => {
  const balance = await PowerBalanceSnapshot.createQueryBuilder('powerBalance')
    .select('powerBalance.balance AS "givPower"')
    .where('powerBalance.userId = :userId', { userId })
    .orderBy('powerBalance.id', 'DESC')
    .limit(1)
    .getRawOne();

  return balance?.givPower || 0;
};

export const findPowerBalances = async (
  round?: number,
  userIds: number[] = [],
  powerSnapshotIds: number[] = [],
  take: number = 100,
  skip: number = 0,
): Promise<[PowerBalanceSnapshot[], number]> => {
  const query = PowerBalanceSnapshot.createQueryBuilder(
    'powerBalance',
  ).innerJoin('powerBalances.powerSnapshot', 'powerSnapshot');

  if (round) {
    query.where('powerSnapshot.roundNumber = :round', { round });
  }

  if (userIds.length > 0 && powerSnapshotIds.length === 0) {
    query.where('powerBalance.userId IN (:...userIds)', { userIds });
  } else if (userIds.length === 0 && powerSnapshotIds.length > 0) {
    query.where('powerBalance.powerSnapshotId IN (:...powerSnapshotId)', {
      powerSnapshotIds,
    });
  } else if (userIds.length > 0 && powerSnapshotIds.length > 0) {
    query
      .where('powerBalance.userId IN (:...userIds)', { userIds })
      .andWhere('powerBalance.powerSnapshotId IN (:...powerSnapshotId)', {
        powerSnapshotIds,
      });
  }

  return query
    .orderBy('powerBalance.id', 'DESC')
    .take(take)
    .skip(skip)
    .getManyAndCount();
};
