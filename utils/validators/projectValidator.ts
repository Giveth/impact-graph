import { getProvider } from '../../provider';
import { Project } from '../../entities/project';
import Web3 from 'web3';
import { errorMessages } from '../errorMessages';

export function isWalletAddressValid(address) {
  return Boolean(address && address.length === 42 && Web3.utils.isAddress(address))
}

export const validateProjectWalletAddress = async (walletAddress: string) => {
  if (!isWalletAddressValid(walletAddress)) {
    throw new Error(errorMessages.INVALID_WALLET_ADDRESS)
  }
  const isSmartContractWallet = await isWalletAddressSmartContract(walletAddress)
  if (isSmartContractWallet) {
    throw new Error(`Eth address ${walletAddress} is a smart contract. We do not support smart contract wallets at this time because we use multiple blockchains, and there is a risk of your losing donations.`)
  }
  const projectWithAddress = await Project.findOne({walletAddress})
  if (projectWithAddress) {
    throw new Error(`Eth address ${walletAddress} is already being used for a project`)

  }
}

export const isWalletAddressSmartContract = async (address: string): Promise<boolean> => {
  const mainnetProvider = getProvider('mainnet')
  const xdaiProvider = getProvider('xdaiChain')
  const isSmartContractMainnet = isSmartContract(mainnetProvider)
  const isSmartContractXDai = isSmartContract(xdaiProvider)
  const isContractPromises: any = []
  isContractPromises.push(isSmartContractMainnet(address))
  isContractPromises.push(isSmartContractXDai(address))

  return Promise.all(isContractPromises).then(promises => {
    const [isSmartContractOnMainnet, isSmartContractOnXDai] = promises
    return Boolean(isSmartContractOnMainnet || isSmartContractOnXDai)
  })
}

function isSmartContract(provider) {
  return async (projectWalletAddress) => {
    const code = await provider.getCode(projectWalletAddress)
    return code !== '0x'
  }
}
