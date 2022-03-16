import config from './config';
import { ethers } from 'ethers';
import Web3 from 'web3';
import { errorMessages } from './utils/errorMessages';

const INFURA_API_KEY = config.get('INFURA_API_KEY');

export const NETWORK_IDS = {
  MAIN_NET: 1,
  ROPSTEN: 3,
  XDAI: 100,
  BSC: 56,
};

const NETWORK_NAMES = {
  BSC: 'bsc',
  XDAI: 'xdaichain',
  MAINNET: 'mainnet',
  ROPSTEN: 'ropsten',
};

const NETWORK_NATIVE_TOKENS = {
  BSC: 'BNB',
  XDAI: 'XDAI',
  MAINNET: 'ETH',
  ROPSTEN: 'ETH',
};

const networkNativeTokensList = [
  {
    networkName: NETWORK_NAMES.BSC,
    networkId: NETWORK_IDS.BSC,
    nativeToken: NETWORK_NATIVE_TOKENS.BSC,
  },
  {
    networkName: NETWORK_NAMES.MAINNET,
    networkId: NETWORK_IDS.MAIN_NET,
    nativeToken: NETWORK_NATIVE_TOKENS.MAINNET,
  },
  {
    networkName: NETWORK_NAMES.XDAI,
    networkId: NETWORK_IDS.XDAI,
    nativeToken: NETWORK_NATIVE_TOKENS.XDAI,
  },
  {
    networkName: NETWORK_NAMES.ROPSTEN,
    networkId: NETWORK_IDS.ROPSTEN,
    nativeToken: NETWORK_NATIVE_TOKENS.ROPSTEN,
  },
];
const NETWORK_ID_MAP = {
  1: NETWORK_NAMES.MAINNET,
  3: NETWORK_NAMES.ROPSTEN,
  100: NETWORK_NAMES.XDAI,
  56: NETWORK_NAMES.BSC,
};

export function getNetworkNativeToken(networkId: number): string {
  const networkInfo = networkNativeTokensList.find(item => {
    return item.networkId === networkId;
  });
  if (!networkInfo) {
    throw new Error(errorMessages.INVALID_NETWORK_ID);
  }
  return networkInfo.nativeToken;
}

const mainnetNodeUrl = `https://${NETWORK_NAMES.MAINNET}.infura.io/v3/${INFURA_API_KEY}`;
const mainnetWeb3 = new Web3(mainnetNodeUrl);
const ropstenNodeUrl = `https://${NETWORK_NAMES.ROPSTEN}.infura.io/v3/${INFURA_API_KEY}`;
const ropstenWeb3 = new Web3(ropstenNodeUrl);
const xdaiWeb3NodeUrl = config.get('XDAI_NODE_HTTP_URL') as string;
const xdaiWeb3 = new Web3(xdaiWeb3NodeUrl);

export const getNetworkWeb3 = (networkId: number): Web3 => {
  switch (networkId) {
    case NETWORK_IDS.MAIN_NET:
      return mainnetWeb3;

    case NETWORK_IDS.ROPSTEN:
      return ropstenWeb3;

    case NETWORK_IDS.XDAI:
      return xdaiWeb3;
    default:
      throw new Error(errorMessages.INVALID_NETWORK_ID);
  }
};

export function getProvider(networkId: number) {
  const network = NETWORK_ID_MAP[networkId];
  if (network === NETWORK_NAMES.XDAI) {
    return new ethers.providers.JsonRpcProvider(
      config.get('XDAI_NODE_HTTP_URL') as string,
    );
  }
  // 'https://bsc-dataseed.binance.org/'
  if (network === NETWORK_NAMES.BSC) {
    return new ethers.providers.JsonRpcProvider(
      config.get('BSC_NODE_HTTP_URL') as string,
      { name: NETWORK_NAMES.BSC, chainId: NETWORK_IDS.BSC },
    );
  }
  return new ethers.providers.InfuraProvider(network, INFURA_API_KEY);
}

export function getEtherscanOrBlockScoutUrl(networkId: number): string {
  switch (networkId) {
    case NETWORK_IDS.XDAI:
      return config.get('BLOCKSCOUT_API_URL') as string;
    case NETWORK_IDS.MAIN_NET:
      return `${config.get('ETHERSCAN_MAINNET_API_URL')}?apikey=${config.get(
        'ETHERSCAN_API_KEY',
      )}`;
    case NETWORK_IDS.ROPSTEN:
      return `${config.get('ETHERSCAN_ROPSTEN_API_URL')}?apikey=${config.get(
        'ETHERSCAN_API_KEY',
      )}`;
    default:
      throw new Error(errorMessages.INVALID_NETWORK_ID);
  }
}
