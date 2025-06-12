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
  tokenContractAddresses: { [chainId: number]: string },
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

    // Get the token contract address for this chain
    const tokenContractAddress = tokenContractAddresses[chainId];
    if (!tokenContractAddress) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.TOKEN_CONTRACT_NOT_CONFIGURED),
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

    // Check if any of the transfer events match the expected amount
    const hasMatchingAmount = relevantEvents.some(event => {
      if (!event.args) {
        return false;
      }
      return event.args.value.gte(expectedAmount);
    });

    if (!hasMatchingAmount) {
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
