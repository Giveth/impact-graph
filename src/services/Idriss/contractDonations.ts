// import ethers..

import { ethers } from 'ethers';
import {
  getLatestBlockNumberFromDonations,
  isTransactionHashStored,
} from '../../repositories/donationRepository';
import { DONATION_EXTERNAL_SOURCES } from '../../entities/donation';
import { verifiedProjectsAddressesWithOptimism } from '../../repositories/projectRepository';

// OP contract ABI
const IDDRISS_TIPPING_CONTRACT_PARAMS = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_nativeUsdAggregator',
        type: 'address',
      },
      { internalType: 'address', name: '_eas', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'bytes', name: 'innerError', type: 'bytes' }],
    name: 'BatchError',
    type: 'error',
  },
  { inputs: [], name: 'InvalidEAS', type: 'error' },
  {
    inputs: [],
    name: 'tipping__withdraw__OnlyAdminCanWithdraw',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'recipientAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'message',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
      { indexed: false, internalType: 'uint256', name: 'fee', type: 'uint256' },
    ],
    name: 'TipMessage',
    type: 'event',
  },
  {
    inputs: [],
    name: 'MINIMAL_PAYMENT_FEE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MINIMAL_PAYMENT_FEE_DENOMINATOR',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PAYMENT_FEE_PERCENTAGE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PAYMENT_FEE_PERCENTAGE_DENOMINATOR',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PAYMENT_FEE_SLIPPAGE_PERCENT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_adminAddress', type: 'address' },
    ],
    name: 'addAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'publicGoodAddress', type: 'address' },
    ],
    name: 'addPublicGood',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'admins',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes[]', name: '_calls', type: 'bytes[]' }],
    name: 'batch',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_minimalPaymentFee', type: 'uint256' },
      {
        internalType: 'uint256',
        name: '_paymentFeeDenominator',
        type: 'uint256',
      },
    ],
    name: 'changeMinimalPaymentFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_paymentFeePercentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_paymentFeeDenominator',
        type: 'uint256',
      },
    ],
    name: 'changePaymentFeePercentage',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'contractOwner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_adminAddress', type: 'address' },
    ],
    name: 'deleteAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'publicGoodAddress', type: 'address' },
    ],
    name: 'deletePublicGood',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: '_value', type: 'uint256' },
      { internalType: 'enum AssetType', name: '_assetType', type: 'uint8' },
    ],
    name: 'getPaymentFee',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'publicGoods',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_recipient', type: 'address' },
      { internalType: 'uint256', name: '_assetId', type: 'uint256' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      {
        internalType: 'address',
        name: '_assetContractAddress',
        type: 'address',
      },
      { internalType: 'string', name: '_message', type: 'string' },
    ],
    name: 'sendERC1155To',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_recipient', type: 'address' },
      { internalType: 'uint256', name: '_tokenId', type: 'uint256' },
      { internalType: 'address', name: '_nftContractAddress', type: 'address' },
      { internalType: 'string', name: '_message', type: 'string' },
    ],
    name: 'sendERC721To',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_recipient', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'string', name: '_message', type: 'string' },
    ],
    name: 'sendTo',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_recipient', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
      { internalType: 'address', name: '_tokenContractAddr', type: 'address' },
      { internalType: 'string', name: '_message', type: 'string' },
    ],
    name: 'sendTokenTo',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes4', name: 'interfaceId', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_tokenContract', type: 'address' },
    ],
    name: 'withdrawToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// contract address
const IDDRISS_ADDRESS_CONTRACT = '0x43f532d678b6a1587be989a50526f89428f68315';

// Initialize with your RPC
const providerUrl = 'https://mainnet.optimism.io';
const ethersProvider = new ethers.providers.JsonRpcProvider(providerUrl);

const tippingContract = new ethers.Contract(
  IDDRISS_ADDRESS_CONTRACT,
  IDDRISS_TIPPING_CONTRACT_PARAMS,
  ethersProvider,
);

export interface IdrissDonation {
  from: string;
  recipient: string;
  amount: string;
  chain: string;
  token: string;
  txHash: string;
}

export const getInputs = async (method, data) => {
  const parsedLog = await tippingContract.interface.parseTransaction({
    data,
  });
  if (method === '16e49145') {
    if (parsedLog) {
      const { args } = parsedLog;

      return {
        recipient_: args[0],
        amount_: args[1],
        tokenContractAddr_: '0x0000000000000000000000000000000000000000',
      };
    }
  } else {
    if (parsedLog) {
      const { args } = parsedLog;

      return {
        recipient_: args[0],
        amount_: args[1],
        tokenContractAddr_: args[2],
      };
    }
  }
  return null;
};

export const getTwitterDonations = async () => {
  const tippingResults: IdrissDonation[] = []; // array
  const startingBlock = await getLatestBlockNumberFromDonations();

  // Add all Giveth recipient addresses in lowercase for recipient filter
  // ['0x5abca791c22e7f99237fcc04639e094ffa0ccce9']; example
  const relevantRecipients = await verifiedProjectsAddressesWithOptimism();

  const tippingEvents = await tippingContract.queryFilter(
    tippingContract.filters.TipMessage(),
    startingBlock,
  );

  for (const event of tippingEvents) {
    if (
      !(await isTransactionHashStored(
        event.transactionHash,
        DONATION_EXTERNAL_SOURCES.IDRISS_TWITTER,
      ))
    ) {
      const t = await ethersProvider.getTransaction(event.transactionHash);
      const method = t.data.slice(2, 10);
      const inputs = await getInputs(method, t.data);
      // Check if recipient is a relevant Giveth recipient
      if (relevantRecipients.includes(inputs!.recipient_.toLowerCase())) {
        tippingResults.push({
          from: t.from,
          recipient: inputs!.recipient_,
          amount: inputs!.amount_,
          chain: 'optimism',
          token:
            inputs!.tokenContractAddr_ ??
            '0x0000000000000000000000000000000000000000',
          txHash: event.transactionHash,
        });
      }
    }
  }
};

// export const createIdrissTwitterDonation = async () => {};
