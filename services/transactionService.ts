import abiDecoder from 'abi-decoder'
import { findTokenByNetworkAndSymbol } from '../utils/tokenUtils'
import { errorMessages } from '../utils/errorMessages'
import {
  NetworkTransactionInfo,
  TransactionDetailInput
} from '../types/TransactionInquiry'
import axios from 'axios'
import { erc20ABI } from '../assets/erc20ABI'
import {
  getEtherscanOrBlockScoutUrl,
  getNetworkWeb3,
  NETWORK_IDS
} from '../provider'

abiDecoder.addABI(erc20ABI)

export async function getTransactionDetail(
  input: TransactionDetailInput
): Promise<NetworkTransactionInfo> {
  const { symbol, networkId } = input

  const web3 = getNetworkWeb3(input.networkId)
  const userTransactionsCount = await web3.eth.getTransactionCount(
    input.fromAddress
  )
  if (input.nonce && userTransactionsCount < input.nonce) {
    console.log('getTransactionDetail check nonce', {
      input,
      userTransactionsCount
    })
    throw new Error(
      errorMessages.TRANSACTION_WITH_THIS_NONCE_IS_NOT_MINED_ALREADY
    )
  }
  let transaction: NetworkTransactionInfo | null

  // we fill it if this is token transfer
  let contractAddress
  if (
    (symbol === 'ETH' && networkId === NETWORK_IDS.MAIN_NET) ||
    (symbol === 'ETH' && networkId === NETWORK_IDS.ROPSTEN) ||
    (symbol === 'XDAI' && networkId === NETWORK_IDS.XDAI)
  ) {
    transaction = await getTransactionDetailForNormalTransfer(input)
  } else {
    const token = findTokenByNetworkAndSymbol(networkId, symbol)
    contractAddress = token.address
    transaction = await getTransactionDetailForTokenTransfer(input, token)
  }

  if (input.nonce && !transaction) {
    // if nonce didn't pass, we can not understand whether is speedup or not
    transaction = await checkIfTransactionHasBeenSpeedup({
      input,
      contractAddress
    })
  } else if (!transaction) {
    throw new Error(errorMessages.TRANSACTION_NOT_FOUND)
  }

  if (transaction.to.toLowerCase() !== input.toAddress.toLowerCase()) {
    throw new Error(
      errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS
    )
  }

  if (
    transaction &&
    transaction.from.toLowerCase() !== input.fromAddress.toLowerCase()
  ) {
    throw new Error(
      errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS
    )
  }
  return transaction
}

async function getTransactionDetailForNormalTransfer(
  input: TransactionDetailInput
): Promise<NetworkTransactionInfo | null> {
  const { txHash, symbol, networkId } = input
  const transaction = await getNetworkWeb3(networkId).eth.getTransaction(txHash)

  if (!transaction) {
    return null
  }
  return {
    from: transaction.from,
    to: transaction.to as string,
    hash: txHash,
    amount: normalizeAmount(transaction.value, 18),
    currency: symbol
  }
}

async function getTransactionDetailForTokenTransfer(
  input: TransactionDetailInput,
  token: {
    address: string
    symbol: string
    decimals: number
  }
): Promise<NetworkTransactionInfo | null> {
  const { txHash, symbol, networkId } = input
  const web3 = getNetworkWeb3(networkId)
  const transaction = await web3.eth.getTransaction(txHash)
  console.log('getTransactionDetailForTokenTransfer', { transaction, input })
  if (
    transaction &&
    transaction.to?.toLowerCase() !== token.address.toLowerCase()
  ) {
    throw new Error(
      errorMessages.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY
    )
  }
  if (!transaction) {
    return null
  }

  const transactionData = abiDecoder.decodeMethod(transaction.input)
  const transactionToAddress = transactionData.params.find(
    item => item.name === '_to'
  ).value

  return {
    from: transaction.from,
    hash: txHash,
    to: transactionToAddress,
    amount: normalizeAmount(
      transactionData.params.find(item => item.name === '_value').value,
      token.decimals
    ),
    currency: symbol
  }
}

export async function checkIfTransactionHasBeenSpeedup(data: {
  input: TransactionDetailInput
  page?: number
  contractAddress?: string
}): Promise<NetworkTransactionInfo> {
  console.log('checkIfTransactionHasBeenSpeedup called', data)
  const { input, page = 1, contractAddress } = data
  const nonce = input.nonce as number
  const { userRecentTransactions, isTransactionListEmpty } = contractAddress
    ? await getListOfTokenTransferTransactionsByAddress({
        address: input.fromAddress,
        page,
        networkId: input.networkId,
        contractAddress
      })
    : await getListOfNormalTransactionsByAddress({
        address: input.fromAddress,
        page,
        networkId: input.networkId
      })
  if (isTransactionListEmpty) {
    // we know that we reached to end of transactions
    console.log(
      'checkIfTransactionHasBeenSpeedup, no more found donations for address',
      {
        page,
        address: input.fromAddress,
        contractAddress
      }
    )
    throw new Error(errorMessages.TRANSACTION_NOT_FOUND)
  }
  const foundTransaction = userRecentTransactions.find(
    tx => tx.nonce === input.nonce
  )
  if (
    foundTransaction &&
    foundTransaction.to.toLowerCase() === input.toAddress.toLowerCase() &&
    foundTransaction.amount === input.amount
  ) {
    return { ...foundTransaction, speedup: true }
  }

  // userRecentTransactions just includes the transactions that source is our fromAddress
  // so if the lowest nonce in this array is smaller than the sent nonce we would know that we should not
  // check latest transactions
  const smallestNonce: number = userRecentTransactions[
    userRecentTransactions.length - 1
  ].nonce as number

  if (smallestNonce < nonce) {
    console.log('checkIfTransactionHasBeenSpeedup', {
      smallestNonce,
      input
    })
    // because the list is descending if the nonce is greater than our desired nonce,
    // the other transactions nonce will not match out transaction so we throw exception
    throw new Error(errorMessages.TRANSACTION_NOT_FOUNT_IN_USER_HISTORY)
  }

  return checkIfTransactionHasBeenSpeedup({
    input,
    page: page + 1,
    contractAddress
  })
}

function normalizeAmount(amount: string, decimals: number): number {
  return Number(amount) / 10 ** decimals
}

async function getListOfNormalTransactionsByAddress(input: {
  networkId: number
  address: string
  page?: number
  offset?: number
}): Promise<{
  userRecentTransactions: NetworkTransactionInfo[]
  isTransactionListEmpty: boolean
}> {
  const { address, page, offset, networkId } = input
  // https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-normal-transactions-by-address
  // https://blockscout.com/xdai/mainnet/api-docs#account
  const result = await axios.get(getEtherscanOrBlockScoutUrl(networkId), {
    params: {
      module: 'account',
      action: 'txlist',
      page: page || 1,
      offset: offset || 1000,
      address,
      sort: 'desc'
    }
  })
  const userRecentTransactions = result.data.result
    .filter(tx => {
      return tx.from.toLowerCase() === input.address.toLowerCase()
    })
    .map(tx => {
      return {
        hash: tx.hash,
        nonce: Number(tx.nonce),
        amount: Number(tx.value) / 10 ** 18,
        from: tx.from,
        to: tx.to,
        currency: networkId === NETWORK_IDS.XDAI ? 'XDAI' : 'ETH'
      }
    })
  return {
    userRecentTransactions,
    isTransactionListEmpty: result.data.result.length === 0
  }
}
async function getListOfTokenTransferTransactionsByAddress(input: {
  networkId: number
  address: string
  contractAddress: string
  page?: number
  offset?: number
}): Promise<{
  userRecentTransactions: NetworkTransactionInfo[]
  isTransactionListEmpty: boolean
}> {
  console.log('getListOfTokenTransferTransactionsByAddress called', input)
  const { address, networkId, contractAddress } = input
  const page = input.page || 1
  const offset = input.offset || 1000
  // https://docs.etherscan.io/api-endpoints/accounts#get-a-list-of-erc20-token-transfer-events-by-address
  // https://blockscout.com/xdai/mainnet/api-docs#account
  const result = await axios.get(getEtherscanOrBlockScoutUrl(networkId), {
    params: {
      module: 'account',
      action: 'tokentx',
      page,
      offset,
      address,
      contractAddress,
      sort: 'desc'
    }
  })
  if (
    !result.data ||
    !result.data.result ||
    !Array.isArray(result.data.result)
  ) {
    console.log(
      'getListOfTokenTransferTransactionsByAddress transactions are empty',
      {
        networkId,
        page,
        offset,
        address,
        contractAddress,
        response: result.data
      }
    )
    throw new Error(errorMessages.TRANSACTION_NOT_FOUNT_IN_USER_HISTORY)
  }
  const userRecentTransactions = result.data.result
    .filter(tx => {
      return tx.from.toLowerCase() === input.address.toLowerCase()
    })
    .map(tx => {
      return {
        hash: tx.hash,
        nonce: Number(tx.nonce),
        amount: Number(tx.value) / 10 ** Number(tx.tokenDecimal),
        from: tx.from,
        to: tx.to,
        currency: tx.tokenSymbol
      }
    })
  return {
    userRecentTransactions,
    isTransactionListEmpty: result.data.result.length === 0
  }
}
