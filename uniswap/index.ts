import { Route, Token, ChainId } from '@uniswap/sdk'
import { getPair } from './pair'
import config from '../config'
import Logger from '../logger'
import axios from 'axios'

const INFURA_ID = config.get('ETHEREUM_NODE_ID')
const ethers = require('ethers')
const network = 'mainnet'
const chainId = 1
const coinListUrl = 'https://wispy-bird-88a7.uniswap.workers.dev/?url=http://erc20.cmc.eth.link'

const provider = new ethers.providers.InfuraProvider(network, INFURA_ID);
const ropstenTokenList = [
    {
      chainId: 3,
      address: '0x067eA48882E6D728A37acfd1535ec03f8E33794a',
      symbol: 'YAY',
      name: 'Giveth Ropsten Test',
      decimals: 18
    },
    {
      chainId: 3,
      address: '0xad6d458402f60fd3bd25163575031acdce07538d',
      symbol: 'DAI',
      name: 'DAI Ropsten',
      decimals: 18
    }
  ]

const xDaiTokenList = [
  {
    chainId: 100,
    address: '0x71850b7E9Ee3f13Ab46d67167341E4bDc905Eef9',
    symbol: 'HNY',
    name: 'Honey',
    decimals: 18
  },
  {
    chainId: 100,
    address: '0xb7D311E2Eb55F2f68a9440da38e7989210b9A05e',
    symbol: 'STAKE',
    name: 'STAKE on xDai'
    // decimals: 18
  },
  {
    chainId: 100,
    address: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
    symbol: 'USDC',
    name: 'USDC on xDai'
    // decimals: 18
  },
  {
    chainId: 100,
    address: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
    symbol: 'WETH',
    name: 'Wrapped Ether on xDai'
    // decimals: 18
  },
  {
    chainId: 100,
    address: '0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2',
    symbol: 'LINK',
    name: 'ChainLink Token on xDai'
    // decimals: 18
  },
  {
    chainId: 100,
    address: '0x1e16aa4Df73d29C029d94CeDa3e3114EC191E25A',
    symbol: 'xMOON',
    name: 'Moons on xDai'
    // decimals: 18
  },
  {
    chainId: 100,
    address: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    symbol: 'WXDAI',
    name: 'Wrapped XDAI'
    // decimals: 18
  },
  {
    chainId: 100,
    address: '0x4ECaBa5870353805a9F068101A40E0f32ed605C6',
    symbol: 'USDT',
    name: 'Tether USD on xDai'
    // decimals: 18
  },
  {
    chainId: 100,
    address: '0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252',
    symbol: 'WBTC',
    name: 'Wrapped BTC on xDai'
    // decimals: 18
  },
  {
    chainId: 100,
    address: '0x3a97704a1b25F08aa230ae53B352e2e72ef52843',
    symbol: 'AGVE',
    name: 'Agave Token'
    // decimals: 18
  }
]
let tokenList
getTokenList().then(cmcList => {
  tokenList = cmcList.concat(xDaiTokenList).concat(ropstenTokenList)
})

export function getOurTokenList() {
  return tokenList
}

export async function getEthPrice() {
  const WETH = new Token(ChainId.MAINNET, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 18, 'WETH', 'Wrapped Ethereum')
  const DAI = new Token(ChainId.MAINNET, '0x6b175474e89094c44da98b954eedeac495271d0f', 18, 'DAI', 'Dai Stablecoin')
  const pair = await getPair(WETH, DAI, provider)
  
  const route = new Route([pair], WETH)
  const price = route.midPrice.toSignificant(6)
  
  console.log('price', price) // 201.306
  
  return price
}

export async function getTokenPrices(symbol: string, baseSymbols:string[], chainId: number) {
  return new Promise((resolve: (prices: number[]) => void, reject) => {
    const pricePromises = baseSymbols.map(base => getTokenPrice(symbol, base, chainId))
    Promise.all(pricePromises).then((prices: number[]) => {
      resolve(prices)
    }).catch(reject)
  })
}

function getEth() {
  return {
    chainId: 1,
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    symbol: "ETH",
    name: "Ether",
    decimals: 18
    }
}
/**
 * Get Token details
 */
export function getToken(symbol: string, chainId: number) {
  if(symbol.toUpperCase() === 'WETH' || symbol.toUpperCase() === 'ETH') return getEth()

  return tokenList.find(o => o.symbol === symbol.toUpperCase() && o.chainId === chainId)
}

 
export async function getTokenPrice(symbol: string, baseSymbol:string, chainId: number) {
  
  const tokens = {}

  tokens[symbol] = getToken(symbol, chainId)
  if(!tokens[symbol]) throw Error(`Symbol ${symbol} not found in our token list`)
  tokens[baseSymbol] = getToken(baseSymbol, chainId)
  if(!tokens[baseSymbol]) throw Error(`BaseSymbol ${baseSymbol} not found in our token list`)

  if(tokens[symbol].address === tokens[baseSymbol].address) return 1

  const token = new Token(ChainId.MAINNET, tokens[symbol].address, tokens[symbol].decimals, tokens[symbol].symbol, tokens[symbol].name)
  const baseToken = new Token(ChainId.MAINNET, tokens[baseSymbol].address, tokens[baseSymbol].decimals, tokens[baseSymbol].symbol, tokens[baseSymbol].name)
  
  const pair = await getPair(token, baseToken, provider)
  
  const route = new Route([pair], token)
  const price = route.midPrice.toSignificant(6)
  
  // console.log('inv', route.midPrice.invert().toSignificant(6)) // 0.00496756
  // console.log('price', price) // 201.306
  
  return Number(price)
  
}

export async function getTokenList() {
  try {
    const response: any = await axios.get(coinListUrl, {})
    return response.data.tokens
  } catch (e) {
    Logger.captureException(e);
    console.error(e)
    throw new Error(e)
  }
}