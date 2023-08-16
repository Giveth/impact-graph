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

export class GivPowerBalanceAggregatorMock
  implements GivPowerBalanceAggregatorInterface
{
  async getBalanceOfAddresses(
    params: GetBalanceOfAddressesInputParams,
  ): Promise<GetBalanceOfAddressesResponse> {
    return params.addresses.split(',').map(address => {
      return {
        address,
        balance: 13, // Just an example balance
        updatedAt: new Date('2023-08-10T16:18:02.655Z'),
        networks: [100],
      };
    });
  }

  async getLatestBalanceOfAnAddress(
    params: GetLatestBalanceOfAnAddressInputParams,
  ): Promise<GetBalanceOfAnAddressesResponse> {
    // Mocked data
    return {
      address: params.address,
      balance: 200, // Just another example balance
      updatedAt: new Date('2023-08-10T16:18:02.655Z'),
      networks: params.network ? [Number(params.network)] : [100],
    };
  }

  async getBalancesUpdatedAfterASpecificDate(
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
    return 1691739112;
  }
}
