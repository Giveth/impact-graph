import Sdk from './sdk'
import config from '../config'
import { allTokens } from './tokenLists'

const INFURA_ID = config.get('ETHEREUM_NODE_ID')
const ethers = require('ethers')
const network = 'mainnet'

//const provider = new ethers.providers.InfuraProvider(network, INFURA_ID)
function getProvider (network) {
  return new ethers.providers.InfuraProvider(network, INFURA_ID)
}

function getNetworkFromChainId (chainId) {
  if (chainId === 1) {
    return 'mainnet'
  } else if (chainId === 100) {
    return 'xdaiChain'
  } else if (chainId === 3) {
    return 'ropstem'
  } else {
    throw new Error('Invalid chainId')
  }
}

export function getOurTokenList () {
  return allTokens
}

export async function getTokenPrices (
  symbol: string,
  baseSymbols: string[],
  chainId: number
) {
  return new Promise((resolve: (prices: number[]) => void, reject) => {
    const pricePromises = baseSymbols.map(base =>
      getTokenPrice(symbol, base, chainId)
    )
    Promise.all(pricePromises)
      .then((prices: number[]) => {
        resolve(prices)
      })
      .catch(reject)
  })
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
export function getTokenFromList (symbol: string, chainId: number) {
  const inSymbol =
    symbol.toUpperCase() === 'ETH' ? 'WETH' : symbol.toUpperCase()

  const token = allTokens.find(
    o => o.symbol === inSymbol && o.chainId === chainId
  )
  if (!token) throw new Error('Token not found')
  return token
}

export async function getTokenPrice (
  symbol: string,
  baseSymbol: string,
  chainId: number
) {
  try {
    const sdk = new Sdk(chainId)

    const token = await sdk.getSwapToken(getTokenFromList(symbol, chainId))

    if (!token) throw Error(`Symbol ${symbol} not found in our token list`)

    const baseToken = await sdk.getSwapToken(
      getTokenFromList(baseSymbol, chainId)
    )
    if (!baseToken)
      throw Error(`BaseSymbol ${baseSymbol} not found in our token list`)

    if (token.address === baseToken.address) return 1

    const pair = await sdk.getPair(
      token,
      baseToken,
      getProvider(getNetworkFromChainId(chainId)),
      chainId
    )

    return sdk.getPrice(pair, token, chainId)
  } catch (error) {
    console.error(error)
    throw new Error(error)
  }
}
