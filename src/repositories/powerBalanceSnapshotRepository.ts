import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';

export const updatePowerSnapshotBalances = async (params: {
  powerSnapshotId: number;
  userId: number;
  balance: number;
}): Promise<void> => {
  const { powerSnapshotId, userId, balance } = params;
  await PowerBalanceSnapshot.createQueryBuilder('power_balance_snapshot')
    .update<PowerBalanceSnapshot>(PowerBalanceSnapshot, {
      balance,
    })
    .where(`"userId"=:userId`, { userId })
    .andWhere(`"powerSnapshotId"=:powerSnapshotId`, { powerSnapshotId })
    .updateEntity(true)
    .execute();
};
