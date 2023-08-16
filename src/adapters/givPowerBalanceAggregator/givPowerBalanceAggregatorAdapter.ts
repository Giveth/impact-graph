// @ts-ignore

import axios from 'axios';
import {
  GetBalanceOfAddressesInputParams,
  GetBalanceOfAddressesResponse,
  GetBalanceOfAnAddressesResponse,
  GetBalancesUpdatedAfterASpecificDateInputParams,
  GetBalancesUpdatedAfterASpecificDateResponse,
  GetLatestBalanceOfAnAddressInputParams,
  GetLeastIndexedBlockTimeStampInputParams,
  GivPowerBalanceAggregatorInterface,
} from './givPowerBalanceAggregatorInterface';
import { logger } from '../../utils/logger';

const formatResponse = (balance: {
  address: string;
  balance: string;
  update_at: Date;
  networks: number[];
}): GetBalanceOfAnAddressesResponse => {
  return {
    address: balance.address,

    // TODO convert wei to eth
    balance: Number(balance.balance),
    updatedAt: new Date(balance.update_at),
    networks: balance.networks,
  };
};

export class GivPowerBalanceAggregatorAdapter
  implements GivPowerBalanceAggregatorInterface
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

  async getBalanceOfAddresses(
    params: GetBalanceOfAddressesInputParams,
  ): Promise<GetBalanceOfAddressesResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/givpower-balance-aggregator/power-balance/by-timestamp`,
        params,
      );
      return response.data.map(balance => formatResponse(balance));
    } catch (e) {
      logger.error('getBalanceOfAnAddress >> error', e);
      throw e;
    }
  }

  async getLatestBalanceOfAnAddress(
    params: GetLatestBalanceOfAnAddressInputParams,
  ): Promise<GetBalanceOfAnAddressesResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/givpower-balance-aggregator/power-balance`,
        params,
      );
      return formatResponse(response.data);
    } catch (e) {
      logger.error('getLatestBalanceOfAnAddress >> error', e);
      throw e;
    }
  }

  async getBalancesUpdatedAfterASpecificDate(
    params: GetBalancesUpdatedAfterASpecificDateInputParams,
  ): Promise<GetBalancesUpdatedAfterASpecificDateResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/givpower-balance-aggregator/power-balance/updated-after-date`,
        params,
      );
      const responseData = response.data;
      const result: GetBalancesUpdatedAfterASpecificDateResponse =
        responseData.balances.map((balance: any) => formatResponse(balance));
      return result;
    } catch (e) {
      logger.error('getBalancesUpdatedAfterASpecificDate >> error', e);
      throw e;
    }
  }

  async getLeastIndexedBlockTimeStamp(
    params: GetLeastIndexedBlockTimeStampInputParams,
  ): Promise<number> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/givpower-balance-aggregator/fetch-state/least-indexed-block-timestamp`,
        params,
      );
      return response.data;
    } catch (e) {
      logger.error('getLeastIndexedBlockTimeStamp >> error', e);
      throw e;
    }
  }
}
