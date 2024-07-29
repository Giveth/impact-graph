import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot.js';

type PowerBalanceSnapshotParams = Pick<
  PowerBalanceSnapshot,
  'userId' | 'balance' | 'powerSnapshotId'
>;
export const addOrUpdatePowerSnapshotBalances = async (
  params: PowerBalanceSnapshotParams[] | PowerBalanceSnapshotParams,
): Promise<void> => {
  await PowerBalanceSnapshot.createQueryBuilder<PowerBalanceSnapshot>()
    .insert()
    .into(PowerBalanceSnapshot)
    .values(params)
    .orUpdate(['balance'], ['userId', 'powerSnapshotId'])
    .execute();
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
  ).innerJoin('powerBalance.powerSnapshot', 'powerSnapshot');

  if (round) {
    query.where('powerSnapshot.roundNumber = :round', { round });
  }

  if (userIds.length > 0 && powerSnapshotIds.length === 0) {
    query.where('powerBalance.userId IN (:...userIds)', { userIds });
  } else if (userIds.length === 0 && powerSnapshotIds.length > 0) {
    query.where('powerBalance.powerSnapshotId IN (:...powerSnapshotIds)', {
      powerSnapshotIds,
    });
  } else if (userIds.length > 0 && powerSnapshotIds.length > 0) {
    query
      .where('powerBalance.userId IN (:...userIds)', { userIds })
      .andWhere('powerBalance.powerSnapshotId IN (:...powerSnapshotIds)', {
        powerSnapshotIds,
      });
  }

  return query
    .orderBy('powerBalance.id', 'DESC')
    .take(take)
    .skip(skip)
    .getManyAndCount();
};
