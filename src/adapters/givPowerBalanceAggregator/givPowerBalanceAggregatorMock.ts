import {
  GetBalancesAtTimestampInputParams,
  GetBalanceOfAddressesResponse,
  GetBalanceOfAnAddressesResponse,
  GetBalancesUpdatedAfterASpecificDateInputParams,
  GetBalancesUpdatedAfterASpecificDateResponse,
  GetLatestBalanceInputParams,
  GetLeastIndexedBlockTimeStampInputParams,
  GivPowerBalanceAggregatorInterface,
} from './givPowerBalanceAggregatorInterface';
import { logger } from '../../utils/logger';
import { convertTimeStampToSeconds } from '../../utils/utils';

export class GivPowerBalanceAggregatorMock
  implements GivPowerBalanceAggregatorInterface
{
  async getAddressesBalance(
    params: GetBalancesAtTimestampInputParams,
  ): Promise<GetBalanceOfAddressesResponse> {
    if (
      params.addresses.length >
      Number(process.env.NUMBER_OF_BALANCE_AGGREGATOR_BATCH)
    ) {
      throw new Error(
        'addresses length can not be greater than NUMBER_OF_BALANCE_AGGREGATOR_BATCH that is defined in .env',
      );
    }
    return params.addresses.map(address => {
      return {
        address,
        balance: 13, // Just an example balance
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: [100],
      };
    });
  }

  async getLatestBalances(
    params: GetLatestBalanceInputParams,
  ): Promise<GetBalanceOfAnAddressesResponse[]> {
    // Mocked data
    return params.addresses.map(address => {
      return {
        address,
        balance: 200, // Just another example balance
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: params.network ? [Number(params.network)] : [100],
      };
    });
  }

  async getBalancesUpdatedAfterDate(
    params: GetBalancesUpdatedAfterASpecificDateInputParams,
  ): Promise<GetBalancesUpdatedAfterASpecificDateResponse> {
    // Mocked data
    return [
      {
        address: '0x1234567890123456789012345678901234567890',
        balance: 300,
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: [100],
      },
    ];
  }

  async getLeastIndexedBlockTimeStamp(
    params: GetLeastIndexedBlockTimeStampInputParams,
  ): Promise<number> {
    // Mocked data
    return convertTimeStampToSeconds(new Date().getTime());
  }
}
