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

export const findPowerBalanceByUserId = async (
  userId: number,
): Promise<number> => {
  const balance = await PowerBalanceSnapshot.createQueryBuilder('powerBalance')
    .select('powerBalance.balance AS givpower')
    .where('powerBalance.userId = :userId', { userId })
    .orderBy('powerBalance.id', 'DESC')
    .limit(1)
    .getRawOne();

  return balance?.givPower || 0;
};
