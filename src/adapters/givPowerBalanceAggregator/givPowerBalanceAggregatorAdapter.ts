import axios from 'axios';
import {
  BalancesAtTimestampInputParams,
  BalanceResponse,
  BalanceUpdatedAfterDateInputParams,
  LatestBalanceInputParams,
  NetworksInputParams,
  IGivPowerBalanceAggregator,
} from '../../types/GivPowerBalanceAggregator.js';
import { logger } from '../../utils/logger.js';
import { formatGivPowerBalance } from '../givpowerSubgraph/givPowerSubgraphAdapter.js';

const formatResponse = (balance: {
  address: string;
  balance: string;
  update_at: Date;
  networks: number[];
}): BalanceResponse => {
  return {
    address: balance.address,
    balance: formatGivPowerBalance(balance.balance),
    updatedAt: new Date(balance.update_at),
    networks: balance.networks,
  };
};

export class GivPowerBalanceAggregatorAdapter
  implements IGivPowerBalanceAggregator
{
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BALANCE_AGGREGATOR_BASE_URL!;
    if (!this.baseUrl) {
      throw new Error(
        'BALANCE_AGGREGATOR_BASE_URL environment variable is not set',
      );
    }
  }

  async getAddressesBalance(
    params: BalancesAtTimestampInputParams,
  ): Promise<BalanceResponse[]> {
    try {
      const data = {
        timestamp: params.timestamp,
        network: params.network,
        networks: params.networks,
        addresses: params.addresses.join(','),
      };
      const response = await axios.get(
        `${this.baseUrl}/power-balance/by-timestamp`,
        {
          params: data,
        },
      );
      return response.data.map(balance => formatResponse(balance));
    } catch (e) {
      logger.error('getBalanceOfAnAddress >> error', e);
      throw e;
    }
  }

  async getLatestBalances(
    params: LatestBalanceInputParams,
  ): Promise<BalanceResponse[]> {
    const data = {
      network: params.network,
      networks: params.networks,
      addresses: params.addresses.join(','),
    };
    try {
      const response = await axios.get(`${this.baseUrl}/power-balance`, {
        params: data,
      });
      return response.data.map(balance => formatResponse(balance));
    } catch (e) {
      logger.error('getLatestBalanceOfAnAddress >> error', e);
      throw e;
    }
  }

  async getBalancesUpdatedAfterDate(
    params: BalanceUpdatedAfterDateInputParams,
  ): Promise<BalanceResponse[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/power-balance/updated-after-date`,
        {
          params,
        },
      );
      const responseData = response.data;
      const result: BalanceResponse[] = responseData.balances.map(
        (balance: any) => formatResponse(balance),
      );
      return result;
    } catch (e) {
      logger.error('getBalancesUpdatedAfterASpecificDate >> error', e);
      throw e;
    }
  }

  async getLeastIndexedBlockTimeStamp(
    params: NetworksInputParams,
  ): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/fetch-state/least-indexed-block-timestamp`,
        {
          params,
        },
      );
      return response.data;
    } catch (e) {
      logger.error('getLeastIndexedBlockTimeStamp >> error', e);
      throw e;
    }
  }
}
