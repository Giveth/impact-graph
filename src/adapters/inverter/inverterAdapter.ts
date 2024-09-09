import axios from 'axios';
import { ethers, providers } from 'ethers';
import {
  getTokenTotalSupplyByAddress,
  getRewardInfoByOrchestratorAddressAndDonerAddress,
  getRewardInfoByOrchestratorAddress,
} from './graphqlSchema';
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

export class InverterAdapter {
  private graphqlUrl: string =
    'https://indexer.bigdevenergy.link/a414bf3/v1/graphql';

  public async getTokenTotalSupplyByAddress(
    tokenAddress: string,
  ): Promise<any> {
    try {
      const result = await axios.post(this.graphqlUrl, {
        query: getTokenTotalSupplyByAddress,
        variables: {
          tokenAddress,
        },
      });
      return result.data.data.BondingCurve?.virtualIssuance;
    } catch (error) {
      logger.error('Error fetching token total supply:', error);
      throw error;
    }
  }

  public async getProjectRewardOfDonor(
    orchestratorAddress: string,
    donerAddress: string,
  ): Promise<any> {
    try {
      const result = await axios.post(this.graphqlUrl, {
        query: getRewardInfoByOrchestratorAddressAndDonerAddress,
        variables: {
          orchestratorAddress,
          donerAddress,
        },
      });
      return result.data.data.StreamingPaymentProcessor;
    } catch (error) {
      logger.error(
        'Error fetching reward info by orchestrator and doner:',
        error,
      );
      throw error;
    }
  }

  // Method to get reward info by orchestrator address
  public async getProjectRewardInfo(orchestratorAddress: string): Promise<any> {
    try {
      const result = await axios.post(this.graphqlUrl, {
        query: getRewardInfoByOrchestratorAddress,
        variables: {
          orchestratorAddress,
        },
      });
      return result.data.data.StreamingPaymentProcessor;
    } catch (error) {
      logger.error(
        'Error fetching reward info by orchestrator address:',
        error,
      );
      throw error;
    }
  }

  public async getTokenPrice(
    provider: providers.Provider,
    contractAddress: string,
  ): Promise<string> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const price: ethers.BigNumber = await contract.getStaticPriceForBuying();
      return ethers.utils.formatUnits(price, 18); // Assuming the price is returned in 18 decimals
    } catch (error) {
      logger.error('Error fetching token price:', error);
      throw error;
    }
  }

  public async getBlockTimestamp(
    provider: providers.Provider,
    blockNumber: number,
  ): Promise<number> {
    const block = await provider.getBlock(blockNumber);
    return block.timestamp;
  }
}

export interface StreamingPaymentProcessorResponse {
  StreamingPaymentProcessor: {
    chainId: number;
    id: string;
    workflow_id: string;
    vestings: Vesting[];
  }[];
}

export interface Vesting {
  amountRaw: string;
  blockTimestamp: number;
  chainId: number;
  cliff: string;
  db_write_timestamp: number;
  end: string;
  id: string;
  recipient: string;
  start: string;
  status: string;
  streamingPaymentProcessor_id: string;
  token: string;
}
