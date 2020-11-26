import Web3 from 'web3'
import Config from '../config'

const config = new Config(process.env)
export const web3 = new Web3(config.get('ETHEREUM_NODE_URL') as string)