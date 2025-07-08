import {
  SwapTransaction,
  SWAP_TRANSACTION_STATUS,
} from '../entities/swapTransaction';
import { DONATION_STATUS } from '../entities/donation';
import { findDonationBySwapId } from './donationRepository';

export const getNotCompletedSwaps = async (): Promise<SwapTransaction[]> => {
  return await SwapTransaction.createQueryBuilder('swap')
    .where('swap.status NOT IN (:...statuses)', {
      statuses: [
        SWAP_TRANSACTION_STATUS.SUCCESS,
        SWAP_TRANSACTION_STATUS.FAILED,
      ],
    })
    .getMany();
};

export const getSwapById = async (
  id: number,
): Promise<SwapTransaction | null> => {
  return await SwapTransaction.findOne({ where: { id } });
};

export const updateSwapStatus = async (
  id: number,
  squidTransactionStatus: string,
): Promise<void> => {
  const swap = await SwapTransaction.findOne({ where: { id } });
  if (!swap) {
    throw new Error(`Swap with id ${id} not found`);
  }

  const metadata = swap.metadata || {};
  metadata.squidTransactionStatus = squidTransactionStatus;

  await SwapTransaction.update(id, {
    status: squidTransactionStatus,
    metadata,
  });
};

export const createSwap = async (params: {
  fromAddress: string;
  toAddress: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  fromChainId: string;
  toChainId: string;
  transactionHash: string;
  requestId?: string;
}): Promise<SwapTransaction> => {
  const swap = SwapTransaction.create({
    fromTokenAddress: params.fromToken,
    toTokenAddress: params.toToken,
    fromAmount: params.fromAmount,
    toAmount: params.toAmount,
    fromChainId: parseInt(params.fromChainId),
    toChainId: parseInt(params.toChainId),
    firstTxHash: params.transactionHash,
    squidRequestId: params.requestId,
    status: SWAP_TRANSACTION_STATUS.PENDING,
  });
  return await swap.save();
};

export const updateSwapDonationStatus = async (
  swapId: number,
  status: {
    squidTransactionStatus: string;
    toChain: { transactionId: string };
  },
): Promise<void> => {
  const swap = await getSwapById(swapId);
  if (!swap) {
    throw new Error(`Swap with id ${swapId} not found`);
  }

  swap.secondTxHash = status.toChain.transactionId;
  swap.status = status.squidTransactionStatus;
  await swap.save();

  const donation = await findDonationBySwapId(swapId);
  if (donation) {
    donation.status = DONATION_STATUS.PENDING;
    donation.transactionId = status.toChain.transactionId;
    await donation.save();
  }
};
