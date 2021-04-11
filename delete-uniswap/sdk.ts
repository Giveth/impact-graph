import * as UniSdk from '@uniswap/sdk'
import * as HoneySdk from 'honeyswap-sdk'

interface token {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
}

function isMainNet (chainId) {
  return chainId === 1
}
function isXDai (chainId) {
  return chainId === 100
}
function isRopsten (chainId) {
  return chainId === 3
}

export default class Sdk {
  sdk: { Token; Route; Pair; Fetcher }

  constructor (public chainId: number) {
    this.chainId = chainId
    this.getSwapSdk(chainId)
  }

  getSwapSdk (chainId) {
    if (isMainNet(chainId) || isRopsten(chainId)) {
      this.sdk = UniSdk
    } else if (isXDai(chainId)) {
      this.sdk = HoneySdk
    } else {
      throw new Error(`${chainId} is unsupported`)
    }
  }

  getSwapToken (token: token) {
    if (!token) throw new Error('Cannot swap a nothing')
    const { chainId, address, decimals, symbol, name } = token

    if (!this.sdk) throw new Error('Sdk not initialised in constructor')
    const { Token } = this.sdk
    return new Token(chainId, address, decimals, symbol, name)
  }

  getPrice (pair, token, chainId) {
    const { Route } = this.sdk

    const route = new Route([pair], token)
    const price = route.midPrice.toSignificant(6)

    // console.log('inv', route.midPrice.invert().toSignificant(6)) // 0.00496756
    // console.log('price', price) // 201.306

    return Number(price)
  }

  async getPair (token0, token1, provider, chainId) {
    const { Fetcher } = this.sdk

    const pair = await Fetcher.fetchPairData(token0, token1, provider)

    return pair
  }
}
