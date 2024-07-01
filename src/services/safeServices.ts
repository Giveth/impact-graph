import SafeApiKit from '@safe-global/api-kit';
import { logger } from '../utils/logger';

export const fetchSafeTransactionHash = async (
  safeMessageHash: string,
  networkId: number,
) => {
  let safeTransactionHash;
  try {
    const safeService = new SafeApiKit({
      chainId: BigInt(networkId),
    });

    const tx = await safeService.getTransaction(safeMessageHash);
    safeTransactionHash = tx?.transactionHash;
  } catch (e) {
    logger.error('fetchSafeTransactionHash() error', e);
  }

  return safeTransactionHash;
};
