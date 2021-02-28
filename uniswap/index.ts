import { getPair } from './pair'
import { Route, Token, ChainId } from '@uniswap/sdk'
import config from '../config'

const ethers = require('ethers')
const INFURA_ID = config.get('ETHEREUM_NODE_ID')
const network = 'mainnet'
const chainId = 1
const provider = new ethers.providers.InfuraProvider(network, INFURA_ID);

export async function getEthPrice() {
  const WETH = new Token(ChainId.MAINNET, '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', 18, 'WETH', 'Wrapped Ethereum')
  const DAI = new Token(ChainId.MAINNET, '0x6b175474e89094c44da98b954eedeac495271d0f', 18, 'DAI', 'Dai Stablecoin')
  const pair = await getPair(WETH, DAI, provider)
  
  const route = new Route([pair], WETH)
  const price = route.midPrice.toSignificant(6)
  
  console.log('price', price) // 201.306
  
  return price
  
}