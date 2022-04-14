import abiDecoder from 'abi-decoder';
import {
  findTokenByNetworkAndAddress,
  findTokenByNetworkAndSymbol,
} from '../utils/tokenUtils';
import { errorMessages } from '../utils/errorMessages';
import {
  NetworkTransactionInfo,
  TransactionDetailInput,
} from '../types/TransactionInquiry';
import axios from 'axios';
import { erc20ABI } from '../assets/erc20ABI';
import { disperseABI } from '../assets/disperseABI';
import {
  getEtherscanOrBlockScoutUrl,
  getNetworkNativeToken,
  getNetworkWeb3,
  NETWORK_IDS,
} from '../provider';
import { logger } from '../utils/logger';

// tslint:disable-next-line:no-var-requires
const ethers = require('ethers');
abiDecoder.addABI(erc20ABI);

export async function getTransactionInfoFromNetwork(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo> {
  const { networkId, nonce } = input;

  const web3 = getNetworkWeb3(networkId);
  const userTransactionsCount = await web3.eth.getTransactionCount(
    input.fromAddress,
  );
  if (typeof nonce === 'number' && userTransactionsCount <= nonce) {
    logger.debug('getTransactionDetail check nonce', {
      input,
      userTransactionsCount,
    });
    throw new Error(
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY,
    );
  }
  let transaction: NetworkTransactionInfo | null = await findTransactionByHash(
    input,
  );

  if (!transaction && nonce) {
    // if nonce didn't pass, we can not understand whether is speedup or not
    transaction = await findTransactionByNonce({
      input,
    });
  }
  if (!transaction) {
    throw new Error(errorMessages.TRANSACTION_NOT_FOUND);
  }
  validateTransactionWithInputData(transaction, input);
  return transaction;
}

export async function findTransactionByHash(input: TransactionDetailInput) {
  const nativeToken = getNetworkNativeToken(input.networkId);
  if (nativeToken === input.symbol) {
    return getTransactionDetailForNormalTransfer(input);
  } else {
    return getTransactionDetailForTokenTransfer(input);
  }
}

async function findTransactionByNonce(data: {
  input: TransactionDetailInput;
  page?: number;
}): Promise<NetworkTransactionInfo | null> {
  logger.debug('findTransactionByNonce called', data);
  const { input, page = 1 } = data;
  const nonce = input.nonce as number;
  const { userRecentTransactions, isTransactionListEmpty } =
    await getListOfTransactionsByAddress({
      address: input.fromAddress,
      page,
      networkId: input.networkId,
    });
  if (isTransactionListEmpty) {
    // we know that we reached to end of transactions
    logger.debug(
      'findTransactionByNonce, no more found donations for address',
      {
        page,
        address: input.fromAddress,
      },
    );
    throw new Error(errorMessages.TRANSACTION_NOT_FOUND);
  }
  const foundTransaction = userRecentTransactions.find(
    tx => tx.nonce === input.nonce,
  );

  if (foundTransaction) {
    return findTransactionByHash({ ...input, txHash: foundTransaction.hash });
  }

  // userRecentTransactions just includes the transactions that source is our fromAddress
  // so if the lowest nonce in this array is smaller than the sent nonce we would know that we should not
  // check latest transactions
  const smallestNonce =
    userRecentTransactions.length > 0
      ? userRecentTransactions[userRecentTransactions.length - 1].nonce
      : undefined;

  if (smallestNonce !== undefined && smallestNonce < nonce) {
    logger.debug('checkIfTransactionHasBeenSpeedup', {
      smallestNonce,
      input,
    });
    // because the list is descending if the nonce is greater than our desired nonce,
    // the other transactions nonce will not match out transaction so we throw exception
    throw new Error(errorMessages.TRANSACTION_NOT_FOUNT_IN_USER_HISTORY);
  }

  return findTransactionByNonce({
    input,
    page: page + 1,
  });
}

function normalizeAmount(amount: string, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}

async function getListOfTransactionsByAddress(input: {
  networkId: number;
  address: string;
  page?: number;
  offset?: number;
}): Promise<{
  userRecentTransactions: {
    hash: string;
    nonce: number;
  }[];
  isTransactionListEmpty: boolean;
}> {
  const { address, page, offset, networkId } = input;
  // https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
  // https://blockscout.com/xdai/mainnet/api-docs#account
  const result = await axios.get(getEtherscanOrBlockScoutUrl(networkId), {
    params: {
      module: 'account',
      action: 'txlist',
      page: page || 1,
      offset: offset || 1000,
      address,
      sort: 'desc',
    },
  });
  const userRecentTransactions = result.data.result
    .filter(tx => {
      return tx.from.toLowerCase() === input.address.toLowerCase();
    })
    .map(tx => {
      // in this case we know it's a token transfer (smart contract call)
      return {
        hash: tx.hash,
        nonce: Number(tx.nonce),
      };
    });
  return {
    userRecentTransactions,
    isTransactionListEmpty: result.data.result.length === 0,
  };
}

async function getTransactionDetailForNormalTransfer(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> {
  const { txHash, symbol, networkId } = input;
  const transaction = await getNetworkWeb3(networkId).eth.getTransaction(
    txHash,
  );
  if (!transaction) {
    return null;
  }
  const block = await getNetworkWeb3(networkId).eth.getBlock(
    transaction.blockNumber as number,
  );

  return {
    from: transaction.from,
    timestamp: block.timestamp as number,
    to: transaction.to as string,
    hash: txHash,
    amount: normalizeAmount(transaction.value, 18),
    currency: symbol,
  };
}

async function getTransactionDetailForTokenTransfer(
  input: TransactionDetailInput,
): Promise<NetworkTransactionInfo | null> {
  const { txHash, symbol, networkId } = input;
  const token = await findTokenByNetworkAndSymbol(networkId, symbol);
  const web3 = getNetworkWeb3(networkId);
  const transaction = await web3.eth.getTransaction(txHash);
  logger.debug('getTransactionDetailForTokenTransfer', {
    transaction,
    input,
    token,
  });
  if (
    transaction &&
    transaction.to?.toLowerCase() !== token.address.toLowerCase()
  ) {
    throw new Error(
      errorMessages.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY,
    );
  }
  if (!transaction) {
    return null;
  }

  const transactionData = abiDecoder.decodeMethod(transaction.input);
  const transactionToAddress = transactionData.params.find(
    item => item.name === '_to',
  ).value;
  const block = await getNetworkWeb3(networkId).eth.getBlock(
    transaction.blockNumber as number,
  );
  return {
    from: transaction.from,
    timestamp: block.timestamp as number,
    hash: txHash,
    to: transactionToAddress,
    amount: normalizeAmount(
      transactionData.params.find(item => item.name === '_value').value,
      token.decimals,
    ),
    currency: symbol,
  };
}

function validateTransactionWithInputData(
  transaction: NetworkTransactionInfo,
  input: TransactionDetailInput,
): never | void {
  if (transaction.to.toLowerCase() !== input.toAddress.toLowerCase()) {
    throw new Error(
      errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
    );
  }

  if (transaction.from.toLowerCase() !== input.fromAddress.toLowerCase()) {
    throw new Error(
      errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
    );
  }
  if (Math.abs(transaction.amount - input.amount) > 0.001) {
    // We ignore small conflicts but for bigger amount we throw exception https://github.com/Giveth/impact-graph/issues/289
    throw new Error(
      errorMessages.TRANSACTION_AMOUNT_IS_DIFFERENT_WITH_SENT_AMOUNT,
    );
  }
  const ONE_HOUR = 60 * 60;
  if (input.timestamp - transaction.timestamp > ONE_HOUR) {
    // because we first create donation, then transaction will be mined, the transaction always should be greater than
    // donation created time, but we set one hour because maybe our server time is different with blockchain time server
    logger.debug('errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION', {
      transaction,
      input,
    });
    throw new Error(errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION);
  }
}

export const getDisperseTransactions = async (
  txHash: string,
  networkId: number,
): Promise<NetworkTransactionInfo[]> => {
  const transaction = await getNetworkWeb3(networkId).eth.getTransaction(
    txHash,
  );
  const block = await getNetworkWeb3(networkId).eth.getBlock(
    transaction.blockNumber as number,
  );
  abiDecoder.addABI(disperseABI);
  const transactionData = abiDecoder.decodeMethod(transaction.input);
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
    throw new Error(errorMessages.INVALID_FUNCTION);
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
  const transaction = await getNetworkWeb3(networkId).eth.getTransaction(
    txHash,
  );
  // You can hash Transfer(address,address,uint256) with https://emn178.github.io/online-tools/keccak_256.html
  // would return ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
  const transferTopic =
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  const receipts = await getNetworkWeb3(networkId).eth.getTransactionReceipt(
    txHash,
  );
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
      to: transferData.args[1].toLowerCase(),
      amount:
        Number(transferData.args[2].toString()) / 10 ** (token.decimals || 18),
      currency: token.symbol,
    };
  });
  const transfers = await Promise.all(transfersPromises);
  const block = await getNetworkWeb3(networkId).eth.getBlock(
    transaction.blockNumber as number,
  );
  return transfers.map(transfer => {
    return {
      ...transfer,
      // Based on this comment the from address of csvAirDrop transactions should be toAddress of transaction , because
      // from is the one who initiated the transaction but we should consider multi sig wallet address
      // https://github.com/Giveth/impact-graph/issues/342#issuecomment-1056952221
      from: (transaction.to as string).toLowerCase(),
      hash: transaction.hash,
      timestamp: block.timestamp as number,
    };
  });
};
