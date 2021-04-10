import config from './config'
const Web3 = require('web3')
const INFURA_ID = config.get('ETHEREUM_NODE_ID')
const ethers = require('ethers')
const network = 'mainnet'

export function getProviderFromChainId (chainId: number) {
  if (chainId === 100) {
    return new ethers.providers.JsonRpcProvider(
      config.get('XDAI_NODE_HTTP_URL')
    )
  } else if (chainId === 3) {
    return new ethers.providers.JsonRpcProvider(
      config.get('XDAI_NODE_HTTP_URL')
    )
  }

  return new ethers.providers.InfuraProvider(network, INFURA_ID)
}
export function getProvider (network) {
  if (network === 'xdaiChain') {
    return new ethers.providers.JsonRpcProvider(
      config.get('XDAI_NODE_HTTP_URL')
    )
  }
  //'https://bsc-dataseed.binance.org/'
  if (network === 'bsc') {
    return new ethers.providers.JsonRpcProvider(
      config.get('BSC_NODE_HTTP_URL'),
      { name: 'binance', chainId: 56 }
    )
  }

  // return new Web3(
  //   new Web3.providers.HttpProvider(config.get('XDAI_NODE_HTTP_URL'))
  // )
  // quiknode return new ethers.providers.JsonRpcProvider(
  //   'https://billowing-billowing-brook.quiknode.pro/04334528cb42b86923888fd5c38ba0553bc84dc6/'
  // )

  // nowork return new ethers.providers.JsonRpcProvider(config.get('XDAI_NODE_HTTP_URL'))
  // nowork return new ethers.providers.JsonRpcProvider(
  //   new Web3(new Web3.providers.HttpProvider(config.get('XDAI_NODE_HTTP_URL')))
  // )
  // console.log(`p : ${JSON.stringify(p, null, 2)}`)
  // return p
  return new ethers.providers.InfuraProvider(network, INFURA_ID)
}

export function getWsProvider (network) {
  if (network === 'xdaiChain') {
    return new Web3(
      new Web3.providers.WebsocketProvider(config.get('XDAI_NODE_WS_URL'))
    )
  }
  if (network === 'bsc') {
    return new Web3(
      new Web3.providers.WebsocketProvider(config.get('BSC_NODE_WS_URL'), {
        name: 'binance',
        chainId: 56
      })
    )
  }
  return new Web3(
    new Web3.providers.WebsocketProvider(
      `wss://mainnet.infura.io/ws/v3/${INFURA_ID}`
    )
  )

  // return new ethers.providers.WebSocketProvider(
  //   network,
  //   `wss://mainnet.infura.io/ws/v3/${INFURA_ID}`
  // )
  // const infuraProvider = new ethers.providers.InfuraProvider(network, INFURA_ID)
  // //console.log(`infuraProvider : ${JSON.stringify(infuraProvider, null, 2)}`)

  // return infuraProvider.WebSocketProvider()
}
