import config from './config';
import { ethers } from 'ethers';
import { i18n, translationErrorMessagesKeys } from './utils/errorMessages';

const INFURA_API_KEY = config.get('INFURA_API_KEY');
const INFURA_ID = config.get('INFURA_ID');

export const NETWORK_IDS = {
  MAIN_NET: 1,
  ROPSTEN: 3,
  GOERLI: 5,
  XDAI: 100,
  POLYGON: 137,
  OPTIMISTIC: 10,
  OPTIMISM_GOERLI: 420,
  BSC: 56,
  CELO: 42220,
  CELO_ALFAJORES: 44787,
};

export const NETWORKS_IDS_TO_NAME = {
  1: 'MAIN_NET',
  3: 'ROPSTEN',
  5: 'GOERLI',
  100: 'GNOSIS',
  56: 'BSC',
  137: 'POLYGON',
  42220: 'CELO',
  44787: 'CELO_ALFAJORES',
  10: 'OPTIMISTIC',
  420: 'OPTIMISM_GOERLI',
};

const NETWORK_NAMES = {
  BSC: 'bsc',
  XDAI: 'xdaichain',
  MAINNET: 'mainnet',
  ROPSTEN: 'ropsten',
  GOERLI: 'goerli',
  POLYGON: 'polygon-mainnet',
  OPTIMISTIC: 'optimistic-mainnet',
  OPTIMISM_GOERLI: 'optimism-goerli-testnet',
  CELO: 'Celo',
  CELO_ALFAJORES: 'Celo Alfajores',
};

const NETWORK_NATIVE_TOKENS = {
  BSC: 'BNB',
  XDAI: 'XDAI',
  MAINNET: 'ETH',
  ROPSTEN: 'ETH',
  GOERLI: 'ETH',
  POLYGON: 'MATIC',
  OPTIMISTIC: 'ETH',
  OPTIMISM_GOERLI: 'ETH',
  CELO: 'CELO',
  CELO_ALFAJORES: 'CELO',
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
  {
    networkName: NETWORK_NAMES.OPTIMISM_GOERLI,
    networkId: NETWORK_IDS.OPTIMISM_GOERLI,
    nativeToken: NETWORK_NATIVE_TOKENS.OPTIMISM_GOERLI,
  },
  {
    networkName: NETWORK_NAMES.CELO,
    networkId: NETWORK_IDS.CELO,
    nativeToken: NETWORK_NATIVE_TOKENS.CELO,
  },
  {
    networkName: NETWORK_NAMES.CELO_ALFAJORES,
    networkId: NETWORK_IDS.CELO_ALFAJORES,
    nativeToken: NETWORK_NATIVE_TOKENS.CELO_ALFAJORES,
  },
];

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
  let url;
  let options;
  switch (networkId) {
    case NETWORK_IDS.XDAI:
      url = config.get('XDAI_NODE_HTTP_URL') as string;
      break;

    case NETWORK_IDS.BSC:
      // 'https://bsc-dataseed.binance.org/'
      url = config.get('BSC_NODE_HTTP_URL') as string;
      options = { name: NETWORK_NAMES.BSC, chainId: NETWORK_IDS.BSC };
      break;

    case NETWORK_IDS.CELO:
      url =
        (config.get('CELO_NODE_HTTP_URL') as string) ||
        `https://celo-mainnet.infura.io/v3/${INFURA_ID}`;
      break;

    case NETWORK_IDS.CELO_ALFAJORES:
      url =
        (config.get('CELO_ALFAJORES_NODE_HTTP_URL') as string) ||
        `https://celo-alfajores.infura.io/v3/${INFURA_ID}`;
      break;

    case NETWORK_IDS.OPTIMISM_GOERLI:
      url = `https://optimism-goerli.infura.io/v3/${INFURA_ID}`;
      break;

    default: {
      // Use infura
      const connectionInfo = ethers.providers.InfuraProvider.getUrl(
        ethers.providers.getNetwork(networkId),
        { projectId: INFURA_ID },
      );
      connectionInfo.headers = {
        ...connectionInfo.headers,
        Origin: getOriginHeader(),
      };
      return new ethers.providers.JsonRpcProvider(connectionInfo);
    }
  }

  return new ethers.providers.JsonRpcProvider(
    {
      url,
      headers: {
        Origin: getOriginHeader(),
      },
    },
    options,
  );
}

export function getBlockExplorerApiUrl(networkId: number): string {
  let apiUrl;
  let apiKey;
  switch (networkId) {
    case NETWORK_IDS.XDAI:
      apiUrl = config.get('GNOSISSCAN_API_URL');
      apiKey = config.get('GNOSISSCAN_API_KEY');
      break;
    case NETWORK_IDS.MAIN_NET:
      apiUrl = config.get('ETHERSCAN_MAINNET_API_URL');
      apiKey = config.get('ETHERSCAN_API_KEY');
      break;
    case NETWORK_IDS.ROPSTEN:
      apiUrl = config.get('ETHERSCAN_ROPSTEN_API_URL');
      apiKey = config.get('ETHERSCAN_API_KEY');
      break;
    case NETWORK_IDS.GOERLI:
      apiUrl = config.get('ETHERSCAN_GOERLI_API_URL');
      apiKey = config.get('ETHERSCAN_API_KEY');
      break;
    case NETWORK_IDS.POLYGON:
      apiUrl = config.get('POLYGON_SCAN_API_URL');
      apiKey = config.get('POLYGON_SCAN_API_KEY');
      break;
    case NETWORK_IDS.CELO:
      apiUrl = config.get('CELO_SCAN_API_URL');
      apiKey = config.get('CELO_SCAN_API_KEY');
      break;
    case NETWORK_IDS.CELO_ALFAJORES:
      apiUrl = config.get('CELO_ALFAJORES_SCAN_API_URL');
      apiKey = config.get('CELO_ALFAJORES_SCAN_API_KEY');
      break;
    case NETWORK_IDS.OPTIMISTIC:
      apiUrl = config.get('OPTIMISTIC_SCAN_API_URL');
      apiKey = config.get('OPTIMISTIC_SCAN_API_KEY');
      break;
    case NETWORK_IDS.OPTIMISM_GOERLI:
      apiUrl = config.get('OPTIMISTIC_SCAN_API_URL');
      apiKey = config.get('OPTIMISTIC_SCAN_API_KEY');
      break;
    default:
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_NETWORK_ID));
  }

  return `${apiUrl}?apikey=${apiKey}`;
}
