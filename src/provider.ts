import config from './config';
import { ethers } from 'ethers';
import { i18n, translationErrorMessagesKeys } from './utils/errorMessages';

const INFURA_API_KEY = config.get('INFURA_API_KEY');

export const NETWORK_IDS = {
  MAIN_NET: 1,
  ROPSTEN: 3,
  GOERLI: 5,
  XDAI: 100,
  POLYGON: 137,
  OPTIMISTIC: 10,
  BSC: 56,
};

export const NETWORKS_IDS_TO_NAME = {
  1: 'MAIN_NET',
  3: 'ROPSTEN',
  5: 'GOERLI',
  100: 'GNOSIS',
  56: 'BSC',
  137: 'POLYGON',
  10: 'OPTIMISTIC',
};

const NETWORK_NAMES = {
  BSC: 'bsc',
  XDAI: 'xdaichain',
  MAINNET: 'mainnet',
  ROPSTEN: 'ropsten',
  GOERLI: 'goerli',
  POLYGON: 'polygon-mainnet',
  OPTIMISTIC: 'optimistic-mainnet',
};

const NETWORK_NATIVE_TOKENS = {
  BSC: 'BNB',
  XDAI: 'XDAI',
  MAINNET: 'ETH',
  ROPSTEN: 'ETH',
  GOERLI: 'ETH',
  POLYGON: 'MATIC',
  OPTIMISTIC: 'ETH',
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
  {
    networkName: NETWORK_NAMES.GOERLI,
    networkId: NETWORK_IDS.GOERLI,
    nativeToken: NETWORK_NATIVE_TOKENS.GOERLI,
  },
  {
    networkName: NETWORK_NAMES.POLYGON,
    networkId: NETWORK_IDS.POLYGON,
    nativeToken: NETWORK_NATIVE_TOKENS.POLYGON,
  },
  {
    networkName: NETWORK_NAMES.OPTIMISTIC,
    networkId: NETWORK_IDS.OPTIMISTIC,
    nativeToken: NETWORK_NATIVE_TOKENS.OPTIMISTIC,
  },
];
const NETWORK_ID_MAP = {
  1: NETWORK_NAMES.MAINNET,
  3: NETWORK_NAMES.ROPSTEN,
  5: NETWORK_NAMES.GOERLI,
  100: NETWORK_NAMES.XDAI,
  56: NETWORK_NAMES.BSC,
};

export function getNetworkNativeToken(networkId: number): string {
  const networkInfo = networkNativeTokensList.find(item => {
    return item.networkId === networkId;
  });
  if (!networkInfo) {
    throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_NETWORK_ID));
  }
  return networkInfo.nativeToken;
}

export const getOriginHeader = () => {
  const SERVICE_NAME = process.env.SERVICE_NAME;
  return 'impact-graph-' + SERVICE_NAME || 'unnamed';
};

export function getProvider(networkId: number) {
  const network = NETWORK_ID_MAP[networkId];
  if (network === NETWORK_NAMES.XDAI) {
    return new ethers.providers.JsonRpcProvider({
      url: config.get('XDAI_NODE_HTTP_URL') as string,
      headers: {
        Origin: getOriginHeader(),
      },
    });
  }
  // 'https://bsc-dataseed.binance.org/'
  if (network === NETWORK_NAMES.BSC) {
    return new ethers.providers.JsonRpcProvider(
      {
        url: config.get('BSC_NODE_HTTP_URL') as string,
        headers: {
          Origin: getOriginHeader(),
        },
      },
      { name: NETWORK_NAMES.BSC, chainId: NETWORK_IDS.BSC },
    );
  }
  const connectionInfo = ethers.providers.InfuraProvider.getUrl(
    ethers.providers.getNetwork(networkId),
    { projectId: INFURA_API_KEY },
  );
  connectionInfo.headers = {
    ...connectionInfo.headers,
    Origin: getOriginHeader(),
  };
  return new ethers.providers.JsonRpcProvider(connectionInfo);
}

export function getBlockExplorerApiUrl(networkId: number): string {
  switch (networkId) {
    case NETWORK_IDS.XDAI:
      return `${config.get('GNOSISSCAN_API_URL')}?apikey=${config.get(
        'GNOSISSCAN_API_KEY',
      )}`;
    case NETWORK_IDS.MAIN_NET:
      return `${config.get('ETHERSCAN_MAINNET_API_URL')}?apikey=${config.get(
        'ETHERSCAN_API_KEY',
      )}`;
    case NETWORK_IDS.ROPSTEN:
      return `${config.get('ETHERSCAN_ROPSTEN_API_URL')}?apikey=${config.get(
        'ETHERSCAN_API_KEY',
      )}`;
    case NETWORK_IDS.GOERLI:
      return `${config.get('ETHERSCAN_GOERLI_API_URL')}?apikey=${config.get(
        'ETHERSCAN_API_KEY',
      )}`;
    case NETWORK_IDS.POLYGON:
      return `${config.get('POLYGON_SCAN_API_URL')}?apikey=${config.get(
        'POLYGON_SCAN_API_KEY',
      )}`;
    // case NETWORK_IDS.OPTIMISTIC:
    //   return `${config.get('OPTIMISTIC_SCAN_API_URL')}?apikey=${config.get(
    //     'OPTIMISTIC_SCAN_API_KEY',
    //   )}`;
    default:
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_NETWORK_ID));
  }
}
