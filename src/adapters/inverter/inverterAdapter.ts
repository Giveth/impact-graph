import axios from 'axios';
import {
  getTokenTotalSupplyByAddress,
  getRewardInfoByOrchestratorAddressAndDonerAddress,
  getRewardInfoByOrchestratorAddress,
} from './graphqlSchema';
import { logger } from '../../utils/logger';

export class InverterAdapter {
  private graphqlUrl: string =
    'https://indexer.bigdevenergy.link/7612f58/v1/graphql';

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
      return result.data.data.BondingCurve;
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
  public async getProjectRewardInfo(
    orchestratorAddress: string,
  ): Promise<any> {
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
}
