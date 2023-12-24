import { logger } from '../../../utils/logger';
import SolanaWeb3, { ParsedInstruction } from '@solana/web3.js';
import {
  NetworkTransactionInfo,
  TransactionDetailInput,
  validateTransactionWithInputData,
} from '../index';
import { normalizeAmount } from '../../../utils/utils';

const SOLANA_NODE_RPC_URL = process.env.SOLANA_NODE_RPC_URL as string;
const solana = new SolanaWeb3.Connection(SOLANA_NODE_RPC_URL);

export const getSolanaTransactionDetailForNormalTransfer = async (params: {
  txHash: string;
}): Promise<NetworkTransactionInfo | null> => {
  const TRANSFER_INSTRUCTION_TYPE = 'transfer';
  const SOL_CURRENCY_TYPE = 'SOL';

  try {
    const result = await solana.getParsedTransaction(params.txHash);
    const data = result?.transaction?.message?.instructions?.find(
      instruction =>
        (instruction as ParsedInstruction)?.parsed?.type ===
        TRANSFER_INSTRUCTION_TYPE,
    );
    if (!data) {
      return null;
    }
    const parsedData = data as ParsedInstruction;

    const txInfo = parsedData.parsed.info;
    if (!txInfo) {
      return null;
    }
    return {
      from: txInfo.source,
      to: txInfo.destination,
      // SOLANA default decimal is 9
      amount: normalizeAmount(txInfo.lamports, 9),
      currency: SOL_CURRENCY_TYPE,
      timestamp: result!.blockTime as number,
      hash: params.txHash,
    };
  } catch (e) {
    logger.error('getSolanaTransactionDetailForNormalTransfer error', e);
    return null;
  }
};

function getTransactionDetailForTokenTransfer(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  throw new Error();
}

export async function getSolanaTransactionInfoFromNetwork(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  const nativeToken = 'SOL';
  let txData;
  if (nativeToken.toLowerCase() === input.symbol.toLowerCase()) {
    txData = await getSolanaTransactionDetailForNormalTransfer(input);
  } else {
    txData = await getTransactionDetailForTokenTransfer(input);
  }

  validateTransactionWithInputData(txData, input);
  return txData;
}
