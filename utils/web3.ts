import Web3 from 'web3'
import config from '../config'

const nodeUrl = `https://${config.get('ETHEREUM_NETWORK')}.infura.io/v3/${config.get('ETHEREUM_NODE_ID')}`
export const web3 = new Web3(nodeUrl)