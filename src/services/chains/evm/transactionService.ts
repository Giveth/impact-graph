import abiDecoder from 'abi-decoder';
import axios from 'axios';
import {
  findTokenByNetworkAndAddress,
  findTokenByNetworkAndSymbol,
} from '../../../utils/tokenUtils';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../../../utils/errorMessages';
import { erc20ABI } from '../../../assets/erc20ABI';
import { disperseABI } from '../../../assets/disperseABI';
import {
  getBlockExplorerApiUrl,
  getNetworkNativeToken,
  getProvider,
  NETWORK_IDS,
} from '../../../provider';
import { logger } from '../../../utils/logger';
import { gnosisSafeL2ABI } from '../../../assets/gnosisSafeL2ABI';
import { NetworkTransactionInfo, TransactionDetailInput } from '../index';
import { normalizeAmount } from '../../../utils/utils';
import { closeTo, ONE_HOUR, validateTransactionWithInputData } from '../index';
import { ITxInfo } from '../../../types/etherscan';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ethers = require('ethers');
abiDecoder.addABI(erc20ABI);
abiDecoder.addABI(gnosisSafeL2ABI);

export async function getEvmTransactionInfoFromNetwork(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  const { networkId, nonce } = input;

  const provider = getProvider(networkId);

  // First try resolving directly by txHash. If it's found/mined, we should not block verification
  // behind nonce-based heuristics (which are EOA-specific and break for smart contract wallets / AA).
  let transaction: NetworkTransactionInfo | null =
    await findEvmTransactionByHash(input);
  if (transaction) {
    await validateTransactionWithInputData(transaction, input);
    return transaction;
  }

  // NOTE: For account-abstraction / smart contract wallets, `getTransactionCount(wallet)`
  // is not meaningful (it stays 0 forever for most contracts). Using it causes donations
  // to remain "pending" indefinitely when a (EOA) nonce is passed from the client.
  // We only apply nonce-based "mined yet?" checks for EOAs.
  let shouldUseNonceChecks = typeof nonce === 'number';
  if (shouldUseNonceChecks) {
    try {
      logger.debug(
        'NODE RPC request count - getTransactionInfoFromNetwork provider.getCode fromAddress:',
        input.fromAddress,
      );
      const code = await provider.getCode(input.fromAddress);
      shouldUseNonceChecks = code === '0x';
    } catch (e) {
      // If `getCode` fails, fall back to legacy behavior for safety
      logger.warn('getTransactionInfoFromNetwork() getCode failed', {
        error: e?.message,
        fromAddress: input.fromAddress,
        networkId,
      });
      shouldUseNonceChecks = typeof nonce === 'number';
    }
  }

  let userTransactionsCount: number | undefined;
  if (shouldUseNonceChecks) {
    logger.debug(
      'NODE RPC request count - getTransactionInfoFromNetwork provider.getTransactionCount txHash:',
      input.txHash,
    );
    userTransactionsCount = await provider.getTransactionCount(
      input.fromAddress,
    );
    if (typeof nonce === 'number' && userTransactionsCount <= nonce) {
      logger.debug('getTransactionDetail check nonce', {
        input,
        userTransactionsCount,
      });
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
        ),
      );
    }
  }
  if (!transaction && nonce && shouldUseNonceChecks) {
    // if nonce didn't pass, we can not understand whether is speedup or not
    transaction = await findEvmTransactionByNonce({
      input,
    });
  }

  if (
    !transaction &&
    (!nonce ||
      // If we skipped nonce checks (contract wallet), treat it as "nonce used" to avoid false negatives
      (typeof userTransactionsCount === 'number' &&
        userTransactionsCount > nonce) ||
      !shouldUseNonceChecks)
  ) {
    // in this case we understand that the transaction will not happen anytime, because nonce is used
    // so this is not speedup for sure
    const timeNow = new Date().getTime() / 1000; // in seconds
    if (input.timestamp - timeNow < ONE_HOUR) {
      throw new Error(
        i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
      );
    }

    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_NOT_FOUND_AND_NONCE_IS_USED,
      ),
    );
  }
  if (!transaction) {
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
    );
  }
  await validateTransactionWithInputData(transaction, input);
  return transaction;
}

const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// EIP-4337 EntryPoint (commonly used on Base and many other EVM networks)
const ERC4337_ENTRYPOINT_ADDRESS = '0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789';

function isErc4337EntryPointTx(to?: string | null): boolean {
  return Boolean(to && to.toLowerCase() === ERC4337_ENTRYPOINT_ADDRESS);
}

function extractErc20TransferFromReceipt(params: {
  receipt: any;
  tokenAddress: string;
  expectedTo: string;
  expectedFrom?: string;
  expectedAmount?: number;
  tokenDecimals: number;
}): { from: string; to: string; amount: number } | null {
  const {
    receipt,
    tokenAddress,
    expectedTo,
    expectedFrom,
    expectedAmount,
    tokenDecimals,
  } = params;
  const logs: any[] = receipt?.logs || [];
  const tokenLower = tokenAddress.toLowerCase();
  const expectedToLower = expectedTo.toLowerCase();
  const expectedFromLower = expectedFrom?.toLowerCase();

  const candidates: Array<{ from: string; to: string; amount: number }> = [];
  for (const log of logs) {
    if (!log?.topics || log.topics.length < 3) continue;
    if ((log.address || '').toLowerCase() !== tokenLower) continue;
    if ((log.topics[0] || '').toLowerCase() !== ERC20_TRANSFER_TOPIC) continue;

    const from = ('0x' + log.topics[1].slice(26)).toLowerCase();
    const to = ('0x' + log.topics[2].slice(26)).toLowerCase();
    if (to !== expectedToLower) continue;

    let rawValue: string;
    try {
      // log.data is 32-byte uint256
      rawValue = ethers.BigNumber.from(log.data).toString();
    } catch {
      continue;
    }
    const amount = normalizeAmount(rawValue, tokenDecimals);
    candidates.push({ from, to, amount });
  }

  if (candidates.length === 0) return null;

  // Prefer: (1) from matches expectedFrom (if provided) AND (2) amount close to expectedAmount (if provided)
  const scored = candidates
    .map(c => {
      const fromMatch = expectedFromLower
        ? c.from === expectedFromLower
        : false;
      const amountMatch =
        typeof expectedAmount === 'number'
          ? closeTo(c.amount, expectedAmount)
          : false;
      const score = (fromMatch ? 2 : 0) + (amountMatch ? 1 : 0);
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0].c;
}

export async function findEvmTransactionByHash(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> {
  const nativeToken = getNetworkNativeToken(input.networkId);
  if (nativeToken.toLowerCase() === input.symbol.toLowerCase()) {
    return getTransactionDetailForNormalTransfer(input);
  } else {
    return getTransactionDetailForTokenTransfer(input);
  }
}

async function findEvmTransactionByNonce(data: {
  input: TransactionDetailInput;
  page?: number;
}): Promise<NetworkTransactionInfo | null> {
  logger.debug('findTransactionByNonce called', data);
  const { input, page = 1 } = data;
  const nonce = input.nonce as number;
  const { userRecentTransactions, lastPage } =
    await getListOfTransactionsByAddress({
      address: input.fromAddress,
      page,
      networkId: input.networkId,
    });
  const foundTransaction = userRecentTransactions.find(
    tx => +tx.nonce === input.nonce,
  );

  if (foundTransaction) {
    return findEvmTransactionByHash({
      ...input,
      txHash: foundTransaction.hash,
    });
  }

  if (lastPage) {
    // we know that we reached to end of transactions
    logger.debug(
      'findEvmTransactionByNonce, no more found donations for address',
      {
        lastPage: page,
        address: input.fromAddress,
      },
    );
    throw new Error(
      i18n.__(translationErrorMessagesKeys.TRANSACTION_NOT_FOUND),
    );
  }

  // userRecentTransactions just includes the transactions that source is our fromAddress
  // so if the lowest nonce in this array is smaller than the sent nonce we would know that we should not
  // check latest transactions
  const smallestNonce =
    userRecentTransactions.length > 0
      ? +userRecentTransactions[userRecentTransactions.length - 1].nonce
      : undefined;

  if (smallestNonce !== undefined && smallestNonce < nonce) {
    logger.debug('checkIfTransactionHasBeenSpeedup', {
      smallestNonce,
      input,
    });
    // because the list is descending if the nonce is greater than our desired nonce,
    // the other transactions nonce will not match out transaction so we throw exception
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_NOT_FOUNT_IN_USER_HISTORY,
      ),
    );
  }

  return findEvmTransactionByNonce({
    input,
    page: page + 1,
  });
}

export async function getListOfTransactionsByAddress(input: {
  networkId: number;
  address: string;
  page?: number;
  offset?: number;
}): Promise<{
  userRecentTransactions: ITxInfo[];
  lastPage: boolean;
}> {
  try {
    const { address, page = 1, offset = 1000, networkId } = input;
    // https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
    // https://blockscout.com/xdai/mainnet/api-docs#account
    logger.debug(
      'NODE RPC request count - getTransactionDetailForTokenTransfer  provider.getTransaction fromAddress:',
      address,
      networkId,
      offset,
    );
    const result = await axios.get(getBlockExplorerApiUrl(networkId), {
      params: {
        module: 'account',
        action: 'txlist',
        page,
        offset,
        address,
        sort: 'desc',
      },
    });

    if (result?.data?.status === '0') {
      // https://docs.gnosisscan.io/support/common-error-messages

      /**
       * sample of these errors
       {
           "status": "0",
           "message": "Query Timeout occured. Please select a smaller result dataset",
           "result": null
         }
       */
      throw new Error(
        result.data?.message ||
          `Error while fetching transactions networkId: ${networkId}`,
      );
    }
    const userRecentTransactions = result.data.result.filter(tx => {
      return tx.from.toLowerCase() === input.address.toLowerCase();
    });

    return {
      userRecentTransactions,
      lastPage: result.data.result.length < offset,
    };
  } catch (e) {
    logger.error('getListOfTransactionsByAddress() err', {
      error: e,
      networkId: input.networkId,
      address: input.address,
    });
    return {
      userRecentTransactions: [],
      lastPage: true,
    };
  }
}

export async function getEvmTransactionTimestamp(input: {
  txHash: string;
  networkId: number;
}): Promise<number> {
  try {
    const { txHash, networkId } = input;
    logger.debug(
      'NODE RPC request count - getTransactionTimeFromBlockchain  provider.getTransaction txHash:',
      input.txHash,
    );
    const transaction = await getProvider(networkId).getTransaction(txHash);
    if (!transaction) {
      throw new Error(errorMessages.TRANSACTION_NOT_FOUND);
    }
    const block = await getProvider(networkId).getBlock(
      transaction.blockNumber as number,
    );
    return block.timestamp * 1000; // convert from seconds to milliseconds
  } catch (e) {
    logger.error('getTransactionTimeFromBlockchain error', e);
    throw new Error(errorMessages.TRANSACTION_NOT_FOUND);
  }
}

async function getTransactionDetailForNormalTransfer(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> {
  const { txHash, symbol, networkId } = input;
  logger.debug(
    'NODE RPC request count - getTransactionDetailForNormalTransfer  provider.getTransaction txHash:',
    input.txHash,
  );
  const transaction = await getProvider(networkId).getTransaction(txHash);
  if (!transaction) {
    return null;
  }
  logger.debug(
    'NODE RPC request count - getTransactionDetailForNormalTransfer  provider.getTransactionReceipt txHash:',
    input.txHash,
  );
  const receipt = await getProvider(networkId).getTransactionReceipt(txHash);
  if (!receipt) {
    // Transaction is not mined yet
    // https://web3js.readthedocs.io/en/v1.2.0/web3-eth.html#gettransactionreceipt
    return null;
  }
  if (!receipt.status) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_STATUS_IS_FAILED_IN_NETWORK,
      ),
    );
  }
  logger.debug(
    'NODE RPC request count - getTransactionDetailForNormalTransfer  provider.getBlock txHash:',
    input.txHash,
  );
  const block = await getProvider(networkId).getBlock(
    transaction.blockNumber as number,
  );

  let transactionTo = transaction.to;
  let transactionFrom = transaction.from;
  let amount = ethers.utils.formatEther(transaction.value);

  if (input.safeTxHash && receipt) {
    const decodedLogs = abiDecoder.decodeLogs(receipt.logs);
    const token = await findTokenByNetworkAndSymbol(networkId, symbol);
    const events = decodedLogs[0].events;

    transactionTo = events[0]?.value?.toLowerCase();
    transactionFrom = decodedLogs[0]?.address;
    amount = normalizeAmount(events[1]?.value, token.decimals);

    if (!transactionTo || !transactionFrom) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.TRANSACTION_STATUS_IS_FAILED_IN_NETWORK,
        ),
      );
    }
  }

  return {
    from: transactionFrom,
    timestamp: block.timestamp as number,
    to: transactionTo as string,
    hash: txHash,
    amount,
    currency: symbol,
  };
}

async function getTransactionDetailForTokenTransfer(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> {
  const { txHash, symbol, networkId, isSwap } = input;
  const token = await findTokenByNetworkAndSymbol(networkId, symbol);
  const provider = getProvider(networkId);
  logger.debug(
    'NODE RPC request count - getTransactionDetailForTokenTransfer  provider.getTransaction txHash:',
    input.txHash,
  );
  const transaction = await provider.getTransaction(txHash);
  if (!transaction) {
    return null;
  }
  const isEntryPointTx = isErc4337EntryPointTx(transaction.to);
  let transactionTokenAddress = transaction.to?.toLowerCase();
  let transactionTo: string;

  logger.debug(
    'NODE RPC request count - getTransactionDetailForTokenTransfer  provider.getTransactionReceipt txHash:',
    input.txHash,
  );
  const receipt = await provider.getTransactionReceipt(txHash);
  logger.debug('getTransactionDetailForTokenTransfer', {
    receipt,
    transaction,
    input,
    token,
  });
  if (!receipt) {
    // Transaction is not mined yet
    // https://web3js.readthedocs.io/en/v1.2.0/web3-eth.html#gettransactionreceipt
    return null;
  }
  const decodedLogs = abiDecoder.decodeLogs(receipt.logs);
  let transactionFrom: string = transaction.from;

  // Multisig Donation
  if (receipt && input.safeTxHash && input.txHash) {
    const events = decodedLogs[1]?.events;

    transactionTokenAddress = decodedLogs[1]?.address?.toLowerCase();
    transactionTo = events[1]?.value?.toLowerCase();
    transactionFrom = events[0]?.value?.toLowerCase();

    if (!transactionTokenAddress || !transactionTo) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.TRANSACTION_STATUS_IS_FAILED_IN_NETWORK,
        ),
      );
    }
  }

  // Swap Transaction
  if (isSwap) {
    // todo: fix it based on the token address in the transaction logs
    transactionTokenAddress = token.address.toLowerCase();
  }

  // Account abstraction: the outer tx goes to the EntryPoint, but the actual ERC20 transfer happens
  // inside the UserOperation. In that case we validate by inspecting ERC20 Transfer logs instead of tx.to.
  if (isEntryPointTx) {
    const transfer = extractErc20TransferFromReceipt({
      receipt,
      tokenAddress: token.address,
      expectedTo: input.toAddress,
      expectedFrom: input.fromAddress,
      expectedAmount: input.amount,
      tokenDecimals: token.decimals,
    });
    if (!transfer) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
        ),
      );
    }
    transactionFrom = transfer.from;
    transactionTo = transfer.to;
    const amount = transfer.amount;

    if (!receipt.status) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.TRANSACTION_STATUS_IS_FAILED_IN_NETWORK,
        ),
      );
    }

    logger.debug(
      'NODE RPC request count - getTransactionDetailForTokenTransfer provider.getBlock txHash:',
      input.txHash,
    );
    const block = await getProvider(networkId).getBlock(
      transaction.blockNumber as number,
    );
    return {
      from: transactionFrom,
      timestamp: block.timestamp as number,
      hash: txHash,
      to: transactionTo!,
      amount,
      currency: symbol,
    };
  }

  if (transactionTokenAddress !== token.address.toLowerCase()) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY,
      ),
    );
  }

  // Normal Donation
  const transactionData = abiDecoder.decodeMethod(transaction.data);
  const transactionToAddress = transactionData?.params?.find(
    item => item.name === '_to',
  )?.value;

  let amount = normalizeAmount(
    transactionData?.params?.find(item => item.name === '_value')?.value || 0,
    token.decimals,
  );

  if (receipt && !input.safeTxHash && input.txHash) {
    transactionTo = transactionToAddress;
  }

  if (receipt && input.safeTxHash && input.txHash) {
    const logsAmount = decodedLogs[1]?.events[2]?.value;

    amount = normalizeAmount(logsAmount, token.decimals);
  }

  if (!receipt.status) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.TRANSACTION_STATUS_IS_FAILED_IN_NETWORK,
      ),
    );
  }

  logger.debug(
    'NODE RPC request count - getTransactionDetailForTokenTransfer  provider.getBlock txHash:',
    input.txHash,
  );
  const block = await getProvider(networkId).getBlock(
    transaction.blockNumber as number,
  );
  return {
    from: transactionFrom,
    timestamp: block.timestamp as number,
    hash: txHash,
    to: transactionTo!,
    amount,
    currency: symbol,
  };
}

export const getDisperseTransactions = async (
  txHash: string,
  networkId: number,
): Promise<NetworkTransactionInfo[]> => {
  const transaction = await getProvider(networkId).getTransaction(txHash);
  const block = await getProvider(networkId).getBlock(
    transaction.blockNumber as number,
  );
  abiDecoder.addABI(disperseABI);
  const transactionData = abiDecoder.decodeMethod(transaction.data);
  const transactions: NetworkTransactionInfo[] = [];

  let token;
  let recipients: string[] = [];
  let amounts: string[] = [];
  logger.debug(
    'getDisperseTransactionDetail() result',
    JSON.stringify(transactionData, null, 4),
  );
  if (transactionData.name === 'disperseEther') {
    token = {
      symbol: networkId === NETWORK_IDS.XDAI ? 'XDAI' : 'ETH',
      decimals: 18,
    };
    recipients = transactionData.params[0].value;
    amounts = transactionData.params[1].value;
  } else if (transactionData.name === 'disperseToken') {
    const tokenAddress = transactionData.params[0].value;
    token = await findTokenByNetworkAndAddress(networkId, tokenAddress);

    recipients = transactionData.params[1].value;
    amounts = transactionData.params[2].value;
  } else {
    throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_FUNCTION));
  }
  for (let i = 0; i < recipients.length; i++) {
    transactions.push({
      from: transaction.from.toLowerCase(),
      to: recipients[i].toLowerCase(),
      amount: normalizeAmount(amounts[i], token.decimals),
      hash: transaction.hash,
      currency: token.symbol,
      timestamp: block.timestamp as number,
    });
  }

  return transactions;
};

export const getCsvAirdropTransactions = async (
  txHash: string,
  networkId: number,
): Promise<NetworkTransactionInfo[]> => {
  const transaction = await getProvider(networkId).getTransaction(txHash);
  // You can hash Transfer(address,address,uint256) with https://emn178.github.io/online-tools/keccak_256.html
  // would return ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
  const transferTopic =
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  const receipts = await getProvider(networkId).getTransactionReceipt(txHash);
  const transferLogs: any[] = [];
  for (const receiptLog of receipts.logs) {
    if (receiptLog.topics[0] !== transferTopic) {
      continue;
    }
    const token = await findTokenByNetworkAndAddress(
      networkId,
      receiptLog.address.toLowerCase(),
    );
    if (token) {
      transferLogs.push(receiptLog);
    }
  }

  // https://github.com/ethers-io/ethers.js/issues/487#issuecomment-481881691
  const abi = [
    'event Transfer(address indexed from, address indexed to, uint value)',
  ];
  const iface = new ethers.utils.Interface(abi);
  const transfersPromises = transferLogs.map(async log => {
    const transferData = iface.parseLog(log);
    const tokenAddress = log.address;
    const token = await findTokenByNetworkAndAddress(networkId, tokenAddress);
    return {
      from: transferData.args[0].toLowerCase(),
      to: transferData.args[1].toLowerCase(),
      amount:
        Number(transferData.args[2].toString()) / 10 ** (token.decimals || 18),
      currency: token.symbol,
    };
  });
  const transfers = await Promise.all(transfersPromises);
  const block = await getProvider(networkId).getBlock(
    transaction.blockNumber as number,
  );
  return transfers.map(transfer => {
    return {
      ...transfer,
      // Based on this comment the from address of csvAirDrop transactions should be toAddress of transaction , because
      // from is the one who initiated the transaction but we should consider multi sig wallet address
      // https://github.com/Giveth/impact-graph/issues/342#issuecomment-1056952221
      // from: (transaction.to as string).toLowerCase(),
      hash: transaction.hash,
      timestamp: block.timestamp as number,
    };
  });
};

export const getGnosisSafeTransactions = async (
  txHash: string,
  networkId: number,
): Promise<NetworkTransactionInfo[]> => {
  // It seems csv airdrop and gnosis safe multi sig transactions are similar so I reused that
  return getCsvAirdropTransactions(txHash, networkId);
};
