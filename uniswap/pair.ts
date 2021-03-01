const { ChainId, Token, WETH, Fetcher, Pair, TokenAmount } = require(  '@uniswap/sdk' )

export async function getPair(token0, token1, provider) {
  const pairAddress = Pair.getAddress(token0, token1)

  const pairUrl = `https://info.uniswap.org/pair/${pairAddress}`
  
  const pair = await Fetcher.fetchPairData(token0, token1, provider)
  
  return pair
  // createPair(pairAddress)
  
}
