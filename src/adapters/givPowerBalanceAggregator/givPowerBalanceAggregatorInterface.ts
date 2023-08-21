export interface GetLeastIndexedBlockTimeStampInputParams {
  networks?: string; // comma separated sample: 100,420
  network?: string | number; // comma separated sample: 100
}

export interface GetLatestBalanceInputParams
  extends GetLeastIndexedBlockTimeStampInputParams {
  addresses: string[]; // sample: [walletAddress1,walletAddress2,..]}
}

export interface GetBalancesAtTimestampInputParams
  extends GetLatestBalanceInputParams {
  timestamp: number; // sample: 1691739112
}

export interface GetBalanceOfAnAddressesResponse {
  address: string; // Ethereum wallet address
  balance: number; // sample: "121936497582050603356340"
  updatedAt: Date; // sample: "2023-08-10T16:18:02.655Z"
  networks: number[]; // sample: [100]
}
export type GetBalanceOfAddressesResponse = GetBalanceOfAnAddressesResponse[];
export type GetBalancesUpdatedAfterASpecificDateResponse =
  GetBalanceOfAddressesResponse;

export interface GetBalancesUpdatedAfterASpecificDateInputParams
  extends GetLeastIndexedBlockTimeStampInputParams {
  date: Date | string | number; // sample: "2023-08-10T16:18:02.655Z"
  take?: number;
  skip?: number;
}

export interface GivPowerBalanceAggregatorInterface {
  getAddressesBalance(
    params: GetBalancesAtTimestampInputParams,
  ): Promise<GetBalanceOfAddressesResponse>;

  getLatestBalances(
    params: GetLatestBalanceInputParams,
  ): Promise<GetBalanceOfAddressesResponse>;

  getBalancesUpdatedAfterDate(
    params: GetBalancesUpdatedAfterASpecificDateInputParams,
  ): Promise<GetBalancesUpdatedAfterASpecificDateResponse>;

  getLeastIndexedBlockTimeStamp(
    params: GetLeastIndexedBlockTimeStampInputParams,
  ): Promise<number>;
}
