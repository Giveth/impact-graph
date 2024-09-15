import { ChainType } from '../../types/network';
import { getSolanaTransactionInfoFromNetwork } from './solana/transactionService';
import { getEvmTransactionInfoFromNetwork } from './evm/transactionService';
import { getStellarTransactionInfoFromNetwork } from './stellar/transactionService';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';
import { NETWORK_IDS } from '../../provider';

export interface NetworkTransactionInfo {
  hash: string;
  amount: number;
  nonce?: number;
  from: string;
  to: string;
  currency: string;
  timestamp: number;
}

export interface TransactionDetailInput {
  txHash: string;
  symbol: string;
  networkId: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  timestamp: number;
  safeTxHash?: string;
  nonce?: number;
  chainType?: ChainType;
  importedFromDraftOrBackupService?: boolean;
}

export const ONE_HOUR = 60 * 60;

export function validateTransactionWithInputData(
  transaction: NetworkTransactionInfo,
  input: TransactionDetailInput,
): never | void {
  if (transaction.to.toLowerCase() !== input.toAddress.toLowerCase()) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
      ),
    );
  }

  if (transaction.from.toLowerCase() !== input.fromAddress.toLowerCase()) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
      ),
    );
  }
  if (!closeTo(transaction.amount, input.amount)) {
    // We ignore small conflicts but for bigger amount we throw exception https://github.com/Giveth/impact-graph/issues/289
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_AMOUNT_IS_DIFFERENT_WITH_SENT_AMOUNT,
      ),
    );
  }

  if (
    // We bypass checking tx and donation time for imported donations from backup service or draft donation
    !input.importedFromDraftOrBackupService &&
    input.timestamp - transaction.timestamp > ONE_HOUR
  ) {
    // because we first create donation, then transaction will be mined, the transaction always should be greater than
    // donation created time, but we set one hour because maybe our server time is different with blockchain time server
    logger.debug(
      'i18n.__(translationErrorMessagesKeys.TRANSACTION_CANT_BE_OLDER_THAN_DONATION)',
      {
        transaction,
        input,
      },
    );
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
      ),
    );
  }
}

export async function getTransactionInfoFromNetwork(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  if (input.chainType === ChainType.SOLANA) {
    return getSolanaTransactionInfoFromNetwork(input);
  }

  if (input.chainType === ChainType.STELLAR) {
    return getStellarTransactionInfoFromNetwork(input);
  }

  // If chain is not Solana, it's EVM for sure
  return getEvmTransactionInfoFromNetwork(input);
}

export function getDefaultSolanaChainId(): number {
  return Number(process.env.SOLANA_CHAIN_ID) || NETWORK_IDS.SOLANA_DEVNET;
}

export function getAppropriateNetworkId(params: {
  chainType?: ChainType;
  networkId: number;
}): number {
  return params.chainType === ChainType.SOLANA
    ? getDefaultSolanaChainId()
    : params.networkId;
}

// This function is used to compare two numbers with a delta as a margin of error
export const closeTo = (a: number, b: number, delta = 0.001) => {
  return Math.abs(a - b) < delta;
};
