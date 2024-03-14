import SolanaWeb3, { ParsedInstruction } from '@solana/web3.js';
import { logger } from '../../../utils/logger';
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
import { findTokenByNetworkAndSymbol } from '../../../utils/tokenUtils';
import { NETWORK_IDS } from '../../../provider';

const solanaProviders = new Map<number, SolanaWeb3.Connection>();

const getSolanaWebProvider = (chainId: number) => {
  if (solanaProviders.has(chainId)) {
    return solanaProviders.get(chainId);
  }
  switch (chainId) {
    case NETWORK_IDS.SOLANA_MAINNET:
      solanaProviders[chainId] = new SolanaWeb3.Connection(
        process.env.SOLANA_MAINNET_NODE_RPC_URL as string,
      );
      break;
    case NETWORK_IDS.SOLANA_TESTNET:
      solanaProviders[chainId] = new SolanaWeb3.Connection(
        process.env.SOLANA_TEST_NODE_RPC_URL as string,
      );
      break;
    default:
      // DEVNET
      solanaProviders[chainId] = new SolanaWeb3.Connection(
        process.env.SOLANA_DEVNET_NODE_RPC_URL as string,
      );
  }
  return solanaProviders[chainId];
};

export const getSolanaTransactionDetailForSolanaTransfer = async (
  params: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> => {
  const TRANSFER_INSTRUCTION_TYPE = 'transfer';
  const SOL_CURRENCY_TYPE = 'SOL';

  try {
    const result = await getSolanaWebProvider(
      params.networkId,
    ).getParsedTransaction(params.txHash);
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

async function getTransactionDetailForSplTokenTransfer(
  params: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> {
  try {
    const SPL_TOKEN_TRANSFER_INSTRUCTION_TYPE = 'spl-token';
    const result = await getSolanaWebProvider(
      params.networkId,
    ).getParsedTransaction(params.txHash);
    const token = await findTokenByNetworkAndSymbol(
      params.networkId,
      params.symbol,
    );

    const data = result?.transaction?.message?.instructions?.find(
      instruction =>
        instruction?.program === SPL_TOKEN_TRANSFER_INSTRUCTION_TYPE &&
        instruction?.parsed?.info.authority === params.fromAddress,
    );
    const toAddressPostBalance = result?.meta?.postTokenBalances?.find(
      balance =>
        balance.owner === params.toAddress && balance.mint === token?.address,
    );
    const toAddressPreBalance = result?.meta?.preTokenBalances?.find(
      balance =>
        balance.owner === params.toAddress && balance.mint === token?.address,
    );
    if (!data || !toAddressPostBalance) {
      return null;
    }

    // toAddressBalance might be null if this is first time that destination wallet receives this token
    const amount =
      toAddressPostBalance.uiTokenAmount?.uiAmount -
      (toAddressPreBalance?.uiTokenAmount?.uiAmount || 0);
    const parsedData = data as ParsedInstruction;

    const txInfo = parsedData.parsed.info;
    if (!txInfo) {
      return null;
    }
    return {
      from: txInfo.authority,

      // we already check toAddressBalance.owner === params.toAddress
      to: toAddressPostBalance?.owner,
      amount,
      currency: params.symbol,
      timestamp: result!.blockTime as number,
      hash: params.txHash,
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
    txData = await getSolanaTransactionDetailForSolanaTransfer(input);
  } else {
    txData = await getTransactionDetailForSplTokenTransfer(input);
  }
  if (!txData) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
    );
  }
  validateTransactionWithInputData(txData, input);
  return txData;
}
