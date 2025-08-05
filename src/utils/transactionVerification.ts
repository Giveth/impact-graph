import { ethers } from 'ethers';
import { logger } from './logger';
import { i18n, translationErrorMessagesKeys } from './errorMessages';
import { getProvider } from '../provider';

// Token contract ABI - we only need the transfer event
const TOKEN_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// Retry configuration for transaction receipt
const RETRY_CONFIG = {
  maxAttempts: 5,
  initialDelayMs: 2000, // 2 seconds
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 2,
};

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to calculate delay with exponential backoff
const calculateDelay = (attempt: number): number => {
  const delay =
    RETRY_CONFIG.initialDelayMs *
    Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
};

// Helper function to get transaction receipt with retry
const getTransactionReceiptWithRetry = async (
  provider: ethers.providers.Provider,
  txHash: string,
  chainId: number,
): Promise<ethers.providers.TransactionReceipt> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        if (attempt > 1) {
          logger.info(`Transaction receipt found after ${attempt} attempts`, {
            txHash,
            chainId,
            attempts: attempt,
          });
        }
        return receipt;
      }

      // Receipt not found, retry if we have more attempts
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const delay = calculateDelay(attempt);
        logger.info(
          `Transaction receipt not found, retrying in ${delay}ms (attempt ${attempt}/${RETRY_CONFIG.maxAttempts})`,
          {
            txHash,
            chainId,
            attempt,
            delay,
          },
        );
        await sleep(delay);
        continue;
      }

      // Last attempt failed
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_TX_HASH));
    } catch (error) {
      lastError = error as Error;

      // If this is the last attempt, throw the error
      if (attempt === RETRY_CONFIG.maxAttempts) {
        logger.error(
          'Failed to get transaction receipt after all retry attempts',
          {
            error: error instanceof Error ? error.message : String(error),
            txHash,
            chainId,
            attempts: attempt,
          },
        );
        throw error;
      }

      // Log the error and continue to next attempt
      logger.warn('Failed to get transaction receipt, will retry', {
        error: error instanceof Error ? error.message : String(error),
        txHash,
        chainId,
        attempt,
        maxAttempts: RETRY_CONFIG.maxAttempts,
      });
    }
  }

  throw lastError || new Error('Failed to get transaction receipt');
};

export async function verifyTransaction(
  txHash: string,
  chainId: number,
  tokenContractAddresses: { [chainId: number]: string },
): Promise<boolean> {
  try {
    const provider = getProvider(chainId);

    // Get transaction receipt with retry
    const receipt = await getTransactionReceiptWithRetry(
      provider,
      txHash,
      chainId,
    );

    // Check if transaction was not successful
    if (receipt.status === 0) {
      throw new Error(i18n.__(translationErrorMessagesKeys.TRANSACTION_FAILED));
    }

    // Get the token contract address for this chain
    const tokenContractAddress = tokenContractAddresses[chainId];
    if (!tokenContractAddress) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.TOKEN_CONTRACT_NOT_CONFIGURED),
      );
    }

    // Get the expected receiver address from environment
    const expectedReceiverAddress = process.env.CAUSE_CREATION_FEE_RECIVER;
    if (!expectedReceiverAddress) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.CAUSE_CREATION_FEE_RECIVER_NOT_CONFIGURED,
        ),
      );
    }

    // Create contract instance
    const contract = new ethers.Contract(
      tokenContractAddress,
      TOKEN_ABI,
      provider,
    );

    // Get transfer events from the transaction
    const transferEvents = await contract.queryFilter(
      contract.filters.Transfer(),
      receipt.blockNumber,
      receipt.blockNumber,
    );

    // Filter events for this specific transaction
    const relevantEvents = transferEvents.filter(
      event => event.transactionHash === txHash,
    );

    if (relevantEvents.length === 0) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.NO_TRANSFER_EVENT_FOUND),
      );
    }

    // Get the expected amount from environment variable
    const expectedAmount = ethers.BigNumber.from(
      process.env.EXPECTED_CAUSE_CREATION_FEE_AMOUNT,
    );
    if (!expectedAmount) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.EXPECTED_CAUSE_CREATION_FEE_AMOUNT_NOT_SET,
        ),
      );
    }

    // Check if any of the transfer events match the expected amount and receiver
    const hasMatchingTransfer = relevantEvents.some(event => {
      if (!event.args) {
        return false;
      }
      const matchesAmount = event.args.value.gte(expectedAmount);
      const matchesReceiver =
        event.args.to.toLowerCase() === expectedReceiverAddress.toLowerCase();
      return matchesAmount && matchesReceiver;
    });

    if (!hasMatchingTransfer) {
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_TX_HASH));
    }

    return true;
  } catch (error) {
    logger.error('Error verifying transaction', {
      error,
      txHash,
      chainId,
      tokenContractAddresses,
    });
    throw error;
  }
}
