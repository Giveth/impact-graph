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

let tokenList
getTokenList().then(list => {
  tokenList = list
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

export async function getTokenPrices(symbol: string, baseSymbols:string[]) {
  return new Promise((resolve: (prices: number[]) => void, reject) => {
    const pricePromises = baseSymbols.map(base => getTokenPrice(symbol, base))
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
export function getToken(symbol: string) {
  if(symbol.toUpperCase() === 'WETH' || symbol.toUpperCase() === 'ETH') return getEth()

  return tokenList.find(o => o.symbol === symbol)
}

 
export async function getTokenPrice(symbol: string, baseSymbol:string) {
  
  const tokens = {}

  tokens[symbol] = getToken(symbol)
  if(!tokens[symbol]) throw Error(`Symbol ${symbol} not found in our token list`)
  tokens[baseSymbol] = getToken(baseSymbol)
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