import { PowerBalanceSnapshot } from '../entities/powerBalanceSnapshot';

export const createPowerSnapshotBalances = async (params: {
  powerSnapshotId: number;
  userId: number;
  balance: number;
}): Promise<PowerBalanceSnapshot> => {
  return PowerBalanceSnapshot.create(params).save();
};
