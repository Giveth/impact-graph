import { logger } from '../../../utils/logger';
import SolanaWeb3, { ParsedInstruction } from '@solana/web3.js';
import {
  NetworkTransactionInfo,
  TransactionDetailInput,
  validateTransactionWithInputData,
} from '../index';
import { normalizeAmount } from '../../../utils/utils';
import {
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';

let solanaProvider;

const getSolanaWebProvider = () => {
  if (solanaProvider) {
    return solanaProvider;
  }
  const SOLANA_NODE_RPC_URL = process.env.SOLANA_NODE_RPC_URL as string;
  solanaProvider = new SolanaWeb3.Connection(SOLANA_NODE_RPC_URL);
  return solanaProvider;
};

export const getSolanaTransactionDetailForSolanaTransfer = async (
  params: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> => {
  const TRANSFER_INSTRUCTION_TYPE = 'transfer';
  const SOL_CURRENCY_TYPE = 'SOL';

  try {
    const result = await getSolanaWebProvider().getParsedTransaction(
      params.txHash,
    );
    const data = result?.transaction?.message?.instructions?.find(
      instruction =>
        instruction?.parsed?.type === TRANSFER_INSTRUCTION_TYPE &&
        instruction?.parsed?.info.source === params.fromAddress &&
        instruction?.parsed?.info.destination === params.toAddress,
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
  throw new Error('Not Implemented');
}

export async function getSolanaTransactionInfoFromNetwork(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  const nativeToken = 'SOL';
  let txData;
  if (nativeToken.toLowerCase() === input.symbol.toLowerCase()) {
    txData = await getSolanaTransactionDetailForSolanaTransfer(input);
  } else {
    txData = await getTransactionDetailForTokenTransfer(input);
  }
  if (!txData) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
    );
  }
  validateTransactionWithInputData(txData, input);
  return txData;
}
