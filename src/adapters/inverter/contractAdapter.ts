import { ethers, Contract, providers } from 'ethers';
import { logger } from '../../utils/logger';

const abi = [
  {
    type: 'function',
    name: 'getStaticPriceForBuying',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
];

export class ContractAdapter {
  private contract: Contract;

  constructor(provider: providers.Provider, contractAddress: string) {
    this.contract = new ethers.Contract(contractAddress, abi, provider);
  }

  public async getTokenPrice(): Promise<string> {
    try {
      const price: ethers.BigNumber =
        await this.contract.getStaticPriceForBuying();
      return ethers.utils.formatUnits(price, 18); // Assuming the price is returned in 18 decimals
    } catch (error) {
      logger.error('Error fetching token price:', error);
      throw error;
    }
  }
}
