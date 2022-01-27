import Sdk from './sdk';
import config from '../config';
import { findTokenByNetworkAndSymbol } from '../utils/tokenUtils';
import { logger } from '../utils/logger';

const INFURA_API_KEY = config.get('INFURA_API_KEY');

// tslint:disable-next-line:no-var-requires
const ethers = require('ethers');

// const provider = new ethers.providers.InfuraProvider(network, INFURA_ID)
function getProvider(network) {
  if (network === 'xdaiChain') {
    return new ethers.providers.JsonRpcProvider(
      config.get('XDAI_NODE_HTTP_URL'),
    );
  }
  return new ethers.providers.InfuraProvider(network, INFURA_API_KEY);
}

function getNetworkFromChainId(chainId) {
  if (chainId === 1) {
    return 'mainnet';
  } else if (chainId === 100) {
    return 'xdaiChain';
  } else if (chainId === 3) {
    return 'ropstem';
  } else {
    throw new Error('Invalid chainId');
  }
}

export async function getTokenPrices(
  symbol: string,
  baseSymbols: string[],
  chainId: number,
) {
  return new Promise((resolve: (prices: number[]) => void, reject) => {
    const pricePromises = baseSymbols.map(base =>
      getTokenPrice(symbol, base, chainId),
    );
    Promise.all(pricePromises)
      .then((prices: number[]) => {
        resolve(prices);
      })
      .catch(reject);
  });
}

// function getEthMainNet () {
//   return {
//     chainId: 1,
//     address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
//     symbol: 'ETH',
//     name: 'Ether',
//     decimals: 18
//   }
// }

/**
 * Get Token details
 */
export function getTokenFromList(symbol: string, chainId: number) {
  let inSymbol = symbol.toUpperCase() === 'ETH' ? 'WETH' : symbol.toUpperCase();

  inSymbol = symbol.toUpperCase() === 'XDAI' ? 'WXDAI' : inSymbol.toUpperCase();

  const token = findTokenByNetworkAndSymbol(chainId, inSymbol);

  if (!token)
    throw new Error(`Token ${inSymbol} not found for chainId ${chainId}`);
  return token;
}

function isTestPrice(symbol, baseSymbol) {
  return (
    (symbol === 'ETH' && baseSymbol === 'USDT') ||
    (symbol === 'ETH' && baseSymbol === 'ETH')
  );
}
function isETHisETH(symbol, baseSymbol) {
  return symbol === 'ETH' && baseSymbol === 'ETH';
}
function getTestPrice(symbol, baseSymbol, chainId) {
  if (symbol === 'ETH' && baseSymbol === 'USDT' && chainId !== 1) return 2000;
  if (symbol === 'ETH' && baseSymbol === 'ETH') return 1;
  throw Error('No test price, this should not happen');
}
function getETHisETHPrice() {
  return 1;
}
export async function getTokenPrice(
  symbol: string,
  baseSymbol: string,
  chainId: number,
) {
  try {
    const sdk = new Sdk(chainId);

    if (isETHisETH(symbol, baseSymbol)) return getETHisETHPrice();
    // Should use main net now
    // if (isTestPrice(symbol, baseSymbol))
    //   return getTestPrice(symbol, baseSymbol, chainId)

    const token = await sdk.getSwapToken(getTokenFromList(symbol, chainId));

    if (!token) throw Error(`Symbol ${symbol} not found in our token list`);

    const baseToken = await sdk.getSwapToken(
      getTokenFromList(baseSymbol, chainId),
    );

    if (!baseToken)
      throw Error(`BaseSymbol ${baseSymbol} not found in our token list`);

    if (token.address === baseToken.address) return 1;

    logger.debug('FIND PAIR');
    logger.debug(`{token,
      baseToken,
      getProvider(getNetworkFromChainId(chainId)),
      chainId} : ${JSON.stringify(
        {
          token,
          baseToken,
          provider: getProvider(getNetworkFromChainId(chainId)),
          chainId,
        },
        null,
        2,
      )}`);

    const pair = await sdk.getPair(
      token,
      baseToken,
      getProvider(getNetworkFromChainId(chainId)),
      chainId,
    );
    // logger.debug(`Found pair : ${JSON.stringify(pair, null, 2)}`)

    const price = sdk.getPrice(pair, token, chainId);
    // logger.debug(`price : ${JSON.stringify(price, null, 2)}`)
    return price;
  } catch (error) {
    logger.error('getTokenPrice error', {
      error,
      symbol,
      baseSymbol,
      chainId,
    });
    throw new Error(error);
  }
}
