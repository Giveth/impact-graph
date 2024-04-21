import _ from 'lodash';
import {
  BalancesAtTimestampInputParams,
  BalanceResponse,
  LatestBalanceInputParams,
  IGivPowerBalanceAggregator,
} from '../../types/GivPowerBalanceAggregator';
import { convertTimeStampToSeconds } from '../../utils/utils';

export class GivPowerBalanceAggregatorAdapterMock
  implements IGivPowerBalanceAggregator
{
  async getAddressesBalance(
    params: BalancesAtTimestampInputParams,
  ): Promise<BalanceResponse[]> {
    if (
      params.addresses.length >
      Number(process.env.NUMBER_OF_BALANCE_AGGREGATOR_BATCH)
    ) {
      throw new Error(
        'addresses length can not be greater than NUMBER_OF_BALANCE_AGGREGATOR_BATCH that is defined in .env',
      );
    }
    return _.uniq(params.addresses).map(address => {
      return {
        address,
        balance: 13, // Just an example balance
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: [100],
      };
    });
  }

  async getLatestBalances(
    params: LatestBalanceInputParams,
  ): Promise<BalanceResponse[]> {
    // Mocked data
    return _.uniq(params.addresses).map(address => {
      return {
        address,
        balance: 200, // Just another example balance
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: params.network ? [Number(params.network)] : [100],
      };
    });
  }

  async getBalancesUpdatedAfterDate(): Promise<BalanceResponse[]> {
    // Mocked data
    return [
      {
        address: '0x1234567890123456789012345678901234567890',
        balance: 300,
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: [100],
      },
      {
        address: '0x1234567890123456789012345678901234567891',
        balance: 400,
        updatedAt: new Date('2023-09-10T16:18:02.655Z'),
        networks: [100],
      },
    ];
  }

  async getLeastIndexedBlockTimeStamp(): Promise<number> {
    // Mocked data
    return convertTimeStampToSeconds(new Date().getTime());
  }
}
