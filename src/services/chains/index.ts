import { ChainType } from '../../types/network';
import { getSolanaTransactionInfoFromNetwork } from './solana/transactionService';
import { getEvmTransactionInfoFromNetwork } from './evm/transactionService';
import { getStellarTransactionInfoFromNetwork } from './stellar/transactionService';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';
import { getProvider, NETWORK_IDS } from '../../provider';

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
  isSwap?: boolean;
  importedFromDraftOrBackupService?: boolean;
}

export const ONE_HOUR = 60 * 60;

export async function isSwapTransactionToProjectAddress(
  networkId: number,
  txHash: string,
  toAddress: string,
): Promise<boolean> {
  try {
    const provider = getProvider(networkId);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt || !receipt.logs) {
      logger.debug('No transaction receipt or logs found for swap validation', {
        txHash,
        networkId,
      });
      return false;
    }

    // For swap transactions, we need to check if there's a transfer event
    // that eventually reaches the target address
    // This is a simplified check - in practice, swap validation should use the Squid API
    const transferEventSignature =
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // Transfer event signature

    for (const log of receipt.logs) {
      try {
        // Check if this is a Transfer event
        if (
          log.topics[0] === transferEventSignature &&
          log.topics.length >= 3
        ) {
          // Extract the 'to' address from the Transfer event (topics[1] is 'from', topics[2] is 'to')
          const transferToAddress = '0x' + log.topics[2].substring(26); // Remove padding

          if (transferToAddress.toLowerCase() === toAddress.toLowerCase()) {
            logger.debug(
              'Found transfer to target address in swap transaction',
              {
                txHash,
                toAddress,
                transferToAddress,
              },
            );
            return true;
          }
        }
      } catch (error) {
        logger.debug('Error parsing log in swap transaction validation', {
          error: error.message,
          log,
        });
        continue;
      }
    }

    logger.debug('No transfer to target address found in swap transaction', {
      txHash,
      toAddress,
    });
    return false;
  } catch (error) {
    logger.error('Error validating swap transaction', {
      error: error.message,
      txHash,
      networkId,
      toAddress,
    });
    return false;
  }
}

export async function validateTransactionWithInputData(
  transaction: NetworkTransactionInfo,
  input: TransactionDetailInput,
): Promise<void> {
  if (input.isSwap) {
    const isValidSwapTransaction = await isSwapTransactionToProjectAddress(
      input.networkId,
      input.txHash,
      input.toAddress,
    );
    if (!isValidSwapTransaction) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.SWAP_TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
        ),
      );
    }
  } else {
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
  return Math.abs(1 - a / b) < delta;
};
