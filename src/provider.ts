import { ethers } from 'ethers';
import config from './config';
import { i18n, translationErrorMessagesKeys } from './utils/errorMessages';
import { logger } from './utils/logger';

const INFURA_ID = config.get('INFURA_ID');

export const NETWORK_IDS = {
  MAIN_NET: 1,
  ROPSTEN: 3,
  SEPOLIA: 11155111,
  XDAI: 100,
  POLYGON: 137,
  OPTIMISTIC: 10,
  OPTIMISM_SEPOLIA: 11155420,
  BSC: 56,
  CELO: 42220,
  CELO_ALFAJORES: 44787,
  ETC: 61,
  MORDOR_ETC_TESTNET: 63,

  ARBITRUM_MAINNET: 42161,
  ARBITRUM_SEPOLIA: 421614,

  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,

  ZKEVM_MAINNET: 1101,
  ZKEVM_CARDONA: 2442,

  STELLAR_MAINNET: 1500,

  // https://docs.particle.network/developers/other-services/node-service/solana-api
  SOLANA_MAINNET: 101,
  SOLANA_TESTNET: 102,
  SOLANA_DEVNET: 103,
};

export const superTokensToToken = {
  ETHx: 'ETH',
  USDCx: 'USDC',
  DAIx: 'DAI',
  OPx: 'OP',
  GIVx: 'GIV',
};

export const superTokens = [
  {
    underlyingToken: {
      decimals: 18,
      id: '0x2f2c819210191750F2E11F7CfC5664a0eB4fd5e6',
      name: 'Giveth',
      symbol: 'GIV',
    },
    decimals: 18,
    id: '0xdfd824f6928b9776c031f7ead948090e2824ce8b',
    name: 'fake Super Giveth Token',
    symbol: 'GIVx',
  },
  {
    underlyingToken: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      id: '0x0000000000000000000000000000000000000000',
    },
    decimals: 18,
    id: '0x0043d7c85c8b96a49a72a92c0b48cdc4720437d7',
    name: 'Super ETH',
    symbol: 'ETHx',
  },
  {
    underlyingToken: {
      decimals: 18,
      id: '0x4200000000000000000000000000000000000042',
      name: 'Optimism',
      symbol: 'OP',
    },
    decimals: 18,
    id: '0x1828bff08bd244f7990eddcd9b19cc654b33cdb4',
    name: 'Super Optimism',
    symbol: 'OPx',
  },
  {
    underlyingToken: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      id: '0x0000000000000000000000000000000000000000',
    },
    decimals: 18,
    id: '0x4ac8bd1bdae47beef2d1c6aa62229509b962aa0d',
    name: 'Super ETH',
    symbol: 'ETHx',
  },
  {
    underlyingToken: {
      decimals: 18,
      id: '0x528cdc92eab044e1e39fe43b9514bfdab4412b98',
      name: 'Giveth Token',
      symbol: 'GIV',
    },
    decimals: 18,
    id: '0x4cab5b9930210e2edc6a905b9c75d615872a1a7e',
    name: 'Super Giveth Token',
    symbol: 'GIVx',
  },
  {
    underlyingToken: {
      decimals: 18,
      id: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
    },
    decimals: 18,
    id: '0x7d342726b69c28d942ad8bfe6ac81b972349d524',
    name: 'Super Dai Stablecoin',
    symbol: 'DAIx',
  },
  {
    underlyingToken: {
      decimals: 6,
      id: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      name: 'USD Coin',
      symbol: 'USDC',
    },
    decimals: 18,
    id: '0x8430f084b939208e2eded1584889c9a66b90562f',
    name: 'Super USD Coin',
    symbol: 'USDCx',
  },
];

export const NETWORKS_IDS_TO_NAME = {
  1: 'MAIN_NET',
  3: 'ROPSTEN',
  11155111: 'SEPOLIA',
  100: 'GNOSIS',
  56: 'BSC',
  137: 'POLYGON',
  42220: 'CELO',
  44787: 'CELO_ALFAJORES',
  10: 'OPTIMISTIC',
  11155420: 'OPTIMISM_SEPOLIA',
  61: 'ETC',
  63: 'MORDOR_ETC_TESTNET',
  42161: 'ARBITRUM_MAINNET',
  421614: 'ARBITRUM_SEPOLIA',

  8453: 'BASE_MAINNET',
  84532: 'BASE_SEPOLIA',

  1101: 'ZKEVM_MAINNET',
  2442: 'ZKEVM_CARDONA',

  1500: 'STELLAR_MAINNET',

  101: 'SOLANA_MAINNET',
  102: 'SOLANA_TESTNET',
  103: 'SOLANA_DEVNET',
};

const NETWORK_NAMES = {
  BSC: 'bsc',
  XDAI: 'xdaichain',
  MAINNET: 'mainnet',
  ROPSTEN: 'ropsten',
  SEPOLIA: 'sepolia',
  POLYGON: 'polygon-mainnet',
  OPTIMISTIC: 'optimistic-mainnet',
  OPTIMISM_SEPOLIA: 'optimism-sepolia-testnet',
  CELO: 'Celo',
  CELO_ALFAJORES: 'Celo Alfajores',
  ETC: 'Ethereum Classic',
  MORDOR_ETC_TESTNET: 'Ethereum Classic Testnet',
  ARBITRUM_MAINNET: 'Arbitrum Mainnet',
  ARBITRUM_SEPOLIA: 'Arbitrum Sepolia',
  BASE_MAINNET: 'Base Mainnet',
  BASE_SEPOLIA: 'Base Sepolia',

  ZKEVM_CARDONA: 'ZKEVM Cardona',
  ZKEVM_MAINNET: 'ZKEVM Mainnet',

  STELLAR_MAINNET: 'Stellar Mainnet',
};

const NETWORK_NATIVE_TOKENS = {
  BSC: 'BNB',
  XDAI: 'XDAI',
  MAINNET: 'ETH',
  ROPSTEN: 'ETH',
  SEPOLIA: 'ETH',
  POLYGON: 'MATIC',
  OPTIMISTIC: 'ETH',
  OPTIMISM_SEPOLIA: 'ETH',
  CELO: 'CELO',
  CELO_ALFAJORES: 'CELO',
  ETC: 'ETC',
  MORDOR_ETC_TESTNET: 'mETC',
  ARBITRUM_MAINNET: 'ETH',
  ARBITRUM_SEPOLIA: 'ETH',
  BASE_MAINNET: 'ETH',
  BASE_SEPOLIA: 'ETH',
  ZKEVM_MAINNET: 'ETH',
  ZKEVM_CARDONA: 'ETH',
  STELLAR_MAINNET: 'XLM',
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
    networkName: NETWORK_NAMES.SEPOLIA,
    networkId: NETWORK_IDS.SEPOLIA,
    nativeToken: NETWORK_NATIVE_TOKENS.SEPOLIA,
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
    networkName: NETWORK_NAMES.OPTIMISM_SEPOLIA,
    networkId: NETWORK_IDS.OPTIMISM_SEPOLIA,
    nativeToken: NETWORK_NATIVE_TOKENS.OPTIMISM_SEPOLIA,
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
  {
    networkName: NETWORK_NAMES.ETC,
    networkId: NETWORK_IDS.ETC,
    nativeToken: NETWORK_NATIVE_TOKENS.ETC,
  },
  {
    networkName: NETWORK_NAMES.MORDOR_ETC_TESTNET,
    networkId: NETWORK_IDS.MORDOR_ETC_TESTNET,
    nativeToken: NETWORK_NATIVE_TOKENS.MORDOR_ETC_TESTNET,
  },
  {
    networkName: NETWORK_NAMES.ARBITRUM_MAINNET,
    networkId: NETWORK_IDS.ARBITRUM_MAINNET,
    nativeToken: NETWORK_NATIVE_TOKENS.ARBITRUM_MAINNET,
  },
  {
    networkName: NETWORK_NAMES.ARBITRUM_SEPOLIA,
    networkId: NETWORK_IDS.ARBITRUM_SEPOLIA,
    nativeToken: NETWORK_NATIVE_TOKENS.ARBITRUM_SEPOLIA,
  },
  {
    networkName: NETWORK_NAMES.BASE_MAINNET,
    networkId: NETWORK_IDS.BASE_MAINNET,
    nativeToken: NETWORK_NATIVE_TOKENS.BASE_MAINNET,
  },
  {
    networkName: NETWORK_NAMES.BASE_SEPOLIA,
    networkId: NETWORK_IDS.BASE_SEPOLIA,
    nativeToken: NETWORK_NATIVE_TOKENS.BASE_SEPOLIA,
  },
  {
    networkName: NETWORK_NAMES.ZKEVM_MAINNET,
    networkId: NETWORK_IDS.ZKEVM_MAINNET,
    nativeToken: NETWORK_NATIVE_TOKENS.ZKEVM_MAINNET,
  },
  {
    networkName: NETWORK_NAMES.ZKEVM_CARDONA,
    networkId: NETWORK_IDS.ZKEVM_CARDONA,
    nativeToken: NETWORK_NATIVE_TOKENS.ZKEVM_CARDONA,
  },
  {
    networkName: NETWORK_NAMES.STELLAR_MAINNET,
    networkId: NETWORK_IDS.STELLAR_MAINNET,
    nativeToken: NETWORK_NATIVE_TOKENS.STELLAR_MAINNET,
  },
];

export function getNetworkNameById(networkId: number): string {
  const networkInfo = networkNativeTokensList.find(
    item => item.networkId === networkId,
  );
  if (!networkInfo) {
    logger.error(
      'getNetworkNameById() error networkNativeTokensList doesnt have info for networkId',
      networkId,
    );
    throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_NETWORK_ID));
  }
  return networkInfo.networkName;
}

export function getNetworkNativeToken(networkId: number): string {
  const networkInfo = networkNativeTokensList.find(item => {
    return item.networkId === networkId;
  });
  if (!networkInfo) {
    logger.error(
      'getNetworkNativeToken() error networkNativeTokensList doesnt have info for networkId',
      networkId,
    );
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
    case NETWORK_IDS.MORDOR_ETC_TESTNET:
      url =
        (process.env.MORDOR_ETC_TESTNET as string) ||
        `https://rpc.mordor.etccooperative.org`;
      break;
    case NETWORK_IDS.ETC:
      url = process.env.ETC_NODE_HTTP_URL as string;
      break;
    case NETWORK_IDS.XDAI:
      url = process.env.XDAI_NODE_HTTP_URL as string;
      break;

    case NETWORK_IDS.BSC:
      // 'https://bsc-dataseed.binance.org/'
      url = process.env.BSC_NODE_HTTP_URL as string;
      options = { name: NETWORK_NAMES.BSC, chainId: NETWORK_IDS.BSC };
      break;

    case NETWORK_IDS.CELO:
      url =
        (process.env.CELO_NODE_HTTP_URL as string) ||
        `https://celo-mainnet.infura.io/v3/${INFURA_ID}`;
      break;

    case NETWORK_IDS.CELO_ALFAJORES:
      url =
        (process.env.CELO_ALFAJORES_NODE_HTTP_URL as string) ||
        `https://celo-alfajores.infura.io/v3/${INFURA_ID}`;
      break;

    case NETWORK_IDS.OPTIMISM_SEPOLIA:
      url = `https://optimism-sepolia.infura.io/v3/${INFURA_ID}`;
      break;

    case NETWORK_IDS.ARBITRUM_MAINNET:
      url =
        (process.env.ARBITRUM_MAINNET_NODE_HTTP_URL as string) ||
        `https://arbitrum-mainnet.infura.io/v3/${INFURA_ID}`;
      break;

    case NETWORK_IDS.ARBITRUM_SEPOLIA:
      url =
        (process.env.ARBITRUM_SEPOLIA_NODE_HTTP_URL as string) ||
        `https://arbitrum-sepolia.infura.io/v3/${INFURA_ID}`;
      break;

    case NETWORK_IDS.BASE_MAINNET:
      url =
        (process.env.BASE_MAINNET_NODE_HTTP_URL as string) ||
        `https://base-mainnet.infura.io/v3/${INFURA_ID}`;
      break;

    case NETWORK_IDS.BASE_SEPOLIA:
      url =
        (process.env.BASE_SEPOLIA_NODE_HTTP_URL as string) ||
        `https://base-sepolia.infura.io/v3/${INFURA_ID}`;
      break;

    // Infura doesn support Polygon ZKEVM
    case NETWORK_IDS.ZKEVM_MAINNET:
      url = process.env.ZKEVM_MAINNET_NODE_HTTP_URL as string;
      break;

    case NETWORK_IDS.ZKEVM_CARDONA:
      url = process.env.ZKEVM_CARDONA_NODE_HTTP_URL as string;
      break;

    case NETWORK_IDS.STELLAR_MAINNET:
      url = process.env.STELLAR_HORIZON_API_URL as string;
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
    case NETWORK_IDS.SEPOLIA:
      apiUrl = config.get('ETHERSCAN_SEPOLIA_API_URL');
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
    case NETWORK_IDS.OPTIMISM_SEPOLIA:
      apiUrl = config.get('OPTIMISTIC_SEPOLIA_SCAN_API_URL');
      apiKey = config.get('OPTIMISTIC_SEPOLIA_SCAN_API_KEY');
      break;
    case NETWORK_IDS.ETC:
      // ETC network doesn't need API key
      return config.get('ETC_SCAN_API_URL') as string;
    case NETWORK_IDS.MORDOR_ETC_TESTNET:
      // ETC network doesn't need API key
      return config.get('MORDOR_ETC_TESTNET_SCAN_API_URL') as string;
    case NETWORK_IDS.ARBITRUM_MAINNET:
      apiUrl = config.get('ARBITRUM_SCAN_API_URL');
      apiKey = config.get('ARBITRUM_SCAN_API_KEY');
      break;
    case NETWORK_IDS.ARBITRUM_SEPOLIA:
      apiUrl = config.get('ARBITRUM_SEPOLIA_SCAN_API_URL');
      apiKey = config.get('ARBITRUM_SEPOLIA_SCAN_API_KEY');
      break;
    case NETWORK_IDS.BASE_MAINNET:
      apiUrl = config.get('BASE_SCAN_API_URL');
      apiKey = config.get('BASE_SCAN_API_KEY');
      break;
    case NETWORK_IDS.BASE_SEPOLIA:
      apiUrl = config.get('BASE_SEPOLIA_SCAN_API_URL');
      apiKey = config.get('BASE_SEPOLIA_SCAN_API_KEY');
      break;
    case NETWORK_IDS.ZKEVM_MAINNET:
      apiUrl = config.get('ZKEVM_MAINNET_SCAN_API_URL');
      apiKey = config.get('ZKEVM_MAINET_SCAN_API_KEY');
      break;
    case NETWORK_IDS.ZKEVM_CARDONA:
      apiUrl = config.get('ZKEVM_CARDONA_SCAN_API_URL');
      apiKey = config.get('ZKEVM_CARDONA_SCAN_API_KEY');
      break;
    case NETWORK_IDS.STELLAR_MAINNET:
      // Stellar network doesn't need API key
      return config.get('STELLAR_SCAN_API_URL') as string;
    default:
      logger.error(
        'getBlockExplorerApiUrl() no url found for networkId',
        networkId,
      );
      throw new Error(i18n.__(translationErrorMessagesKeys.INVALID_NETWORK_ID));
  }

  return `${apiUrl}?apikey=${apiKey}`;
}
