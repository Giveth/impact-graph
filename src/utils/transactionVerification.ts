import { ethers } from 'ethers';
import { logger } from './logger';
import { i18n, translationErrorMessagesKeys } from './errorMessages';
import { getProvider } from '../provider';

// Token contract ABI - we only need the transfer event
const TOKEN_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export async function verifyTransaction(
  txHash: string,
  chainId: number,
  tokenContractAddress: string,
): Promise<boolean> {
  try {
    const provider = getProvider(chainId);

    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_TX_HASH));
    }

    // Check if transaction was not successful
    if (receipt.status === 0) {
      throw new Error(i18n.__(translationErrorMessagesKeys.TRANSACTION_FAILED));
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

    return true;
  } catch (error) {
    logger.error('Error verifying transaction', {
      error,
      txHash,
      chainId,
      tokenContractAddress,
    });
    throw error;
  }
}
