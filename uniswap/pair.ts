const { ChainId, Token, WETH, Fetcher, Pair, TokenAmount } = require(  '@uniswap/sdk' )

export async function getPair(token0, token1, provider) {
  const pairAddress = Pair.getAddress(token0, token1)

  console.log(`pairAddress ---> : ${pairAddress}`)
  const pairUrl = `https://info.uniswap.org/pair/${pairAddress}`
  console.log('pair url ', pairUrl)
  
  const pair = await Fetcher.fetchPairData(token0, token1, provider)
  
  return pair
  // createPair(pairAddress)
  
}
