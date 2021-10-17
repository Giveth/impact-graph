import config from './config'
import { ethers } from 'ethers'

const INFURA_ID = config.get('ETHEREUM_NODE_ID')

export function getProvider(network) {
  if (network === 'xdaiChain') {
    return new ethers.providers.JsonRpcProvider(
      config.get('XDAI_NODE_HTTP_URL') as string
    )
  }
  // 'https://bsc-dataseed.binance.org/'
  if (network === 'bsc') {
    return new ethers.providers.JsonRpcProvider(
      config.get('BSC_NODE_HTTP_URL') as string,
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
