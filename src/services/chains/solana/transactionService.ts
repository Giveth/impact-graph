import { logger } from '../../../utils/logger';
import SolanaWeb3, {
  ParsedInnerInstruction,
  ParsedInstruction,
} from '@solana/web3.js';
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
import { findTokenByTokenAddress } from '../../../repositories/tokenRepository';
import { findTokenByNetworkAndSymbol } from '../../../utils/tokenUtils';

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

async function getTransactionDetailForTokenTransfer(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> {
  const TRANSFER_INSTRUCTION_TYPE = 'transfer';

  try {
    const token = await findTokenByNetworkAndSymbol(
      input.networkId,
      input.symbol,
    );
    const TOKEN_TRANSFER_PROGRAM = 'spl-token';
    const result = await solana.getParsedTransaction(input.txHash);
    const transferInstruction =
      result?.meta?.innerInstructions?.[0]?.instructions.find(
        instruction =>
          (instruction as ParsedInstruction)?.parsed?.type ===
            TRANSFER_INSTRUCTION_TYPE &&
          (instruction as ParsedInstruction).program === TOKEN_TRANSFER_PROGRAM,
      );

    if (!transferInstruction) {
      return null;
    }
    const tokenAddress = result?.meta?.postTokenBalances?.[0].mint;
    if (tokenAddress && tokenAddress !== token?.address) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY,
        ),
      );
    }
    const parsedData = transferInstruction as ParsedInstruction;

    const txInfo = parsedData.parsed.info;
    if (!txInfo) {
      return null;
    }
    return {
      from: txInfo.source,
      to: txInfo.destination,
      // SOLANA default decimal is 9
      amount: normalizeAmount(txInfo.amount, 9),
      currency: input.symbol,
      timestamp: result!.blockTime as number,
      hash: input.txHash,
    };
  } catch (e) {
    logger.error('getSolanaTransactionDetailForNormalTransfer error', e);
    return null;
  }
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
  if (!txData) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
    );
  }
  validateTransactionWithInputData(txData, input);
  return txData;
}
