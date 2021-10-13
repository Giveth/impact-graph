import Web3 from 'web3'
import abiDecoder from 'abi-decoder'
import { findTokenByNetworkAndSymbol, NETWORK_IDS } from '../utils/tokenUtils';
import { errorMessages } from '../utils/errorMessages';
import { NetworkTransactionInfo, TransactionDetailInput } from '../types/TransactionInquiry';
import axios from 'axios';
import config from '../config';

const mainnetNodeUrl = config.get('MAINNET_NODE_HTTP_URL') as string
const mainnetWeb3 = new Web3(mainnetNodeUrl)
const ropstenNodeUrl = config.get('ROPSTEN_NODE_HTTP_URL') as string
const ropstenWeb3 = new Web3(ropstenNodeUrl)
const xdaiWeb3NodeUrl = config.get('XDAI_NODE_HTTP_URL') as string
const xdaiWeb3 = new Web3(xdaiWeb3NodeUrl)

const getNetworkWeb3 = (networkId: number): Web3 => {
  switch (networkId) {
    case  NETWORK_IDS.MAIN_NET:
      return mainnetWeb3

    case  NETWORK_IDS.ROPSTEN:
      return ropstenWeb3

    case  NETWORK_IDS.XDAI:
      return xdaiWeb3
    default:
      throw new Error(errorMessages.INVALID_NETWORK_ID)
  }

}

/**
 * @see @link{https://gist.github.com/veox/8800debbf56e24718f9f483e1e40c35c, https://stackoverflow.com/a/67617052/4650625}
 */
const erc20ABI =
  [
    {
      'constant': true,
      'inputs': [],
      'name': 'name',
      'outputs': [
        {
          'name': '',
          'type': 'string'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': '_spender',
          'type': 'address'
        },
        {
          'name': '_value',
          'type': 'uint256'
        }
      ],
      'name': 'approve',
      'outputs': [
        {
          'name': '',
          'type': 'bool'
        }
      ],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [],
      'name': 'totalSupply',
      'outputs': [
        {
          'name': '',
          'type': 'uint256'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': '_from',
          'type': 'address'
        },
        {
          'name': '_to',
          'type': 'address'
        },
        {
          'name': '_value',
          'type': 'uint256'
        }
      ],
      'name': 'transferFrom',
      'outputs': [
        {
          'name': '',
          'type': 'bool'
        }
      ],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [],
      'name': 'decimals',
      'outputs': [
        {
          'name': '',
          'type': 'uint8'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': '_owner',
          'type': 'address'
        }
      ],
      'name': 'balanceOf',
      'outputs': [
        {
          'name': 'balance',
          'type': 'uint256'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [],
      'name': 'symbol',
      'outputs': [
        {
          'name': '',
          'type': 'string'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'constant': false,
      'inputs': [
        {
          'name': '_to',
          'type': 'address'
        },
        {
          'name': '_value',
          'type': 'uint256'
        }
      ],
      'name': 'transfer',
      'outputs': [
        {
          'name': '',
          'type': 'bool'
        }
      ],
      'payable': false,
      'stateMutability': 'nonpayable',
      'type': 'function'
    },
    {
      'constant': true,
      'inputs': [
        {
          'name': '_owner',
          'type': 'address'
        },
        {
          'name': '_spender',
          'type': 'address'
        }
      ],
      'name': 'allowance',
      'outputs': [
        {
          'name': '',
          'type': 'uint256'
        }
      ],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    },
    {
      'payable': true,
      'stateMutability': 'payable',
      'type': 'fallback'
    },
    {
      'anonymous': false,
      'inputs': [
        {
          'indexed': true,
          'name': 'owner',
          'type': 'address'
        },
        {
          'indexed': true,
          'name': 'spender',
          'type': 'address'
        },
        {
          'indexed': false,
          'name': 'value',
          'type': 'uint256'
        }
      ],
      'name': 'Approval',
      'type': 'event'
    },
    {
      'anonymous': false,
      'inputs': [
        {
          'indexed': true,
          'name': 'from',
          'type': 'address'
        },
        {
          'indexed': true,
          'name': 'to',
          'type': 'address'
        },
        {
          'indexed': false,
          'name': 'value',
          'type': 'uint256'
        }
      ],
      'name': 'Transfer',
      'type': 'event'
    }
  ];
abiDecoder.addABI(erc20ABI);


const normalizeAmount = (amount: string, decimals: number): number => {
  return Number(amount) / 10 ** decimals;
}


const getEtherscanOrBlockScoutUrl = (networkId: number): string => {
  switch (networkId) {
    case NETWORK_IDS.XDAI:
      return config.get('BLOCKSCOUT_API_URL') as string
    case NETWORK_IDS.MAIN_NET:
      return `${config.get('ETHERSCAN_MAINNET_API_URL')}?apikey=${config.get('ETHERSCAN_API_KEY')}`
    case NETWORK_IDS.ROPSTEN:
      return `${config.get('ETHERSCAN_ROPSTEN_API_URL')}?apikey=${config.get('ETHERSCAN_API_KEY')}`
    default:
      throw new Error(errorMessages.INVALID_NETWORK_ID)
  }
}

const getListOfNormalTransactionsByAddress = async (input: {
  networkId: number,
  address: string,
  page?: number,
  offset?: number,
}): Promise<NetworkTransactionInfo[]> => {
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
    }
  })
  return result.data.result.filter(tx => {
    return tx.from.toLowerCase() === input.address.toLowerCase()
  }).map(tx => {
    return {
      hash: tx.hash,
      nonce: Number(tx.nonce),
      amount: Number(tx.value) / 10 ** 18,
      from: tx.from,
      to: tx.to,
      currency: networkId === NETWORK_IDS.XDAI ? 'XDAI' : 'ETH'
    }
  })
}
const getListOfTokenTransferTransactionsByAddress = async (input: {
  networkId: number,
  address: string,
  contractAddress: string,
  page?: number,
  offset?: number,
}): Promise<NetworkTransactionInfo[]> => {
  console.log('getListOfTokenTransferTransactionsByAddress called', input)
  const { address, networkId, contractAddress } = input;
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
      sort: 'desc',
    }
  })
  if (!result.data || !result.data.result || !Array.isArray(result.data.result)){
    console.log('getListOfTokenTransferTransactionsByAddress transactions are empty',{
      networkId,
      page,
      offset,
      address,
      contractAddress,
      response : result.data
    })
    throw new Error(errorMessages.TRANSACTION_NOT_FOUNT_IN_USER_HISTORY)
  }

  return result.data.result.filter(tx => {
    return tx.from.toLowerCase() === input.address.toLowerCase()
  }).map(tx => {
    return {
      hash: tx.hash,
      nonce: Number(tx.nonce),
      amount: Number(tx.value) / 10 ** Number(tx.tokenDecimal),
      from: tx.from,
      to: tx.to,
      currency: tx.tokenSymbol
    }
  })
}

export const checkIfTransactionHasBeenSpeedup =
  async (data: { input: TransactionDetailInput, page?: number, contractAddress?: string }):
    Promise<NetworkTransactionInfo> => {
  console.log('checkIfTransactionHasBeenSpeedup called', data)
    const { input, page =1, contractAddress } = data
    const nonce = input.nonce as number;
    const recentDonations = contractAddress ? await getListOfTokenTransferTransactionsByAddress({
      address: input.fromAddress,
      page,
      networkId: input.networkId,
      contractAddress
    }) : await getListOfNormalTransactionsByAddress({
      address: input.fromAddress,
      page,
      networkId: input.networkId
    });
    if (recentDonations.length === 0 ){
      console.log('checkIfTransactionHasBeenSpeedup, no more found donations for address', {
        page,
        address: input.fromAddress,
        contractAddress
      })
      throw new Error(errorMessages.TRANSACTION_NOT_FOUND)
    }
    const foundTransaction = recentDonations.find(tx => tx.nonce === input.nonce)
    if (foundTransaction &&
      foundTransaction.to.toLowerCase() === input.toAddress.toLowerCase() &&
      foundTransaction.amount === input.amount
    ) {
      return { ...foundTransaction, speedup: true }
    }
    console.log('checkIfTransactionHasBeenSpeedup', {
      recentDonationsLength: recentDonations.length,
      lastDonation: recentDonations[recentDonations.length - 1],
      nonce,
      page,
    })
    const smallestNonce: number = recentDonations[recentDonations.length - 1].nonce as number


    if (smallestNonce < nonce) {
      // because the list is descending if the nonce is greater than our desired nonce,
      // the other transactions nonce will not match out transaction so we throw exception
      throw new Error(errorMessages.TRANSACTION_NOT_FOUNT_IN_USER_HISTORY)

    }

    return checkIfTransactionHasBeenSpeedup({ input, page: page + 1, contractAddress })

  }

async function getTransactionDetailForNormalTransfer(input: TransactionDetailInput): Promise<NetworkTransactionInfo> {
  const {
    txHash,
    symbol,
    networkId,
    fromAddress,
    toAddress,
    nonce
  } = input;
  const transaction = await getNetworkWeb3(networkId).eth.getTransaction(txHash)
  if (transaction && transaction.from.toLowerCase() !== fromAddress.toLowerCase()) {
    throw new Error(errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS)
  }
  if (transaction && transaction.to && transaction.to.toLowerCase() !== toAddress.toLowerCase()) {
    throw new Error(errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS)
  }
  // ADD checking for toAddress and amount

  if (transaction) {
    return {
      from: transaction.from,
      to: transaction.to as string,
      hash: txHash,
      amount: normalizeAmount(transaction.value, 18),
      currency: symbol
    };
  }

  if (!nonce) {
    // if nonce didn't pass, we can not understand whether is speedup or not
    throw new Error(errorMessages.TRANSACTION_NOT_FOUND)
  }
  return checkIfTransactionHasBeenSpeedup({ input })
}

async function getTransactionDetailForTokenTransfer(input: TransactionDetailInput): Promise<NetworkTransactionInfo> {
  const {
    txHash,
    symbol,
    networkId,
    fromAddress,
    nonce,
    toAddress
  } = input;
  const token = findTokenByNetworkAndSymbol(networkId, symbol)
  const web3 = getNetworkWeb3(networkId)
  const transaction = await web3.eth.getTransaction(txHash)
  console.log('getTransactionDetailForTokenTransfer', {transaction, input})
  if (transaction && transaction.to?.toLowerCase() !== token.address.toLowerCase()) {
    throw new Error(errorMessages.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY)
  }
  if (transaction && transaction.from.toLowerCase() !== fromAddress.toLowerCase()) {
    console.log('fromAddress of donation is different', {
      transaction,
      input
    })
    throw new Error(errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS)
  }
  if (transaction) {
    const transactionData = abiDecoder.decodeMethod(transaction.input)
    const transactionToAddress = transactionData.params.find(item => item.name === '_to').value;
    if (transactionToAddress.toLowerCase() !== toAddress.toLowerCase()) {
      throw new Error(errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS)
    }
    return {
      from: transaction.from,
      hash: txHash,
      to: transactionToAddress,
      amount: normalizeAmount(transactionData.params.find(item => item.name === '_value').value, token.decimals),
      currency: symbol
    }
  }

  if (!nonce) {
    // if nonce didn't pass, we can not understand whether is speedup or not
    throw new Error(errorMessages.TRANSACTION_NOT_FOUND)
  }
  return checkIfTransactionHasBeenSpeedup({ input, contractAddress:token.address })
}

export async function getTransactionDetail(input: TransactionDetailInput): Promise<NetworkTransactionInfo> {
  const {
    symbol,
    networkId
  } = input;

  //  refactor this condition with array.some , ...
  if (symbol === 'ETH' && networkId === NETWORK_IDS.MAIN_NET) {
    return getTransactionDetailForNormalTransfer(input)
  } else if (symbol === 'ETH' && networkId === NETWORK_IDS.ROPSTEN) {
    return getTransactionDetailForNormalTransfer(input)
  } else if (symbol === 'XDAI' && networkId === NETWORK_IDS.XDAI) {
    return getTransactionDetailForNormalTransfer(input)
  }
  return getTransactionDetailForTokenTransfer(input);
}
