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
