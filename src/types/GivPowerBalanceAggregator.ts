export interface NetworksInputParams {
  networks?: string; // comma separated sample: 100,420
  network?: string | number; // comma separated sample: 100
}

export interface LatestBalanceInputParams extends NetworksInputParams {
  addresses: string[]; // sample: [walletAddress1,walletAddress2,..]}
}

export interface BalancesAtTimestampInputParams
  extends LatestBalanceInputParams {
  timestamp: number; // sample: 1691739112
}

export interface BalanceResponse {
  address: string; // Ethereum wallet address
  balance: number; // sample: "121936497582050603356340"
  updatedAt: Date; // sample: "2023-08-10T16:18:02.655Z"
  networks: number[]; // sample: [100]
}

export interface BalanceUpdatedAfterDateInputParams
  extends NetworksInputParams {
  date: Date | string | number; // sample: "2023-08-10T16:18:02.655Z"
  take?: number;
  skip?: number;
}

export interface IGivPowerBalanceAggregator {
  getAddressesBalance(
    params: BalancesAtTimestampInputParams,
  ): Promise<BalanceResponse[]>;

  getLatestBalances(
    params: LatestBalanceInputParams,
  ): Promise<BalanceResponse[]>;

  getBalancesUpdatedAfterDate(
    params: BalanceUpdatedAfterDateInputParams,
  ): Promise<BalanceResponse[]>;

  getLeastIndexedBlockTimeStamp(params: NetworksInputParams): Promise<number>;
}
