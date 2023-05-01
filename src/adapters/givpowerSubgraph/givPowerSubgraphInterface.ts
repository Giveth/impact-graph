export interface BlockInfo {
  number: number;
  timestamp: number;
}

export interface UnipoolBalance {
  balance: number;
  updatedAt: number;
}

export interface GivPowerSubgraphInterface {
  getUserPowerBalanceAtBlockNumber(params: {
    walletAddresses: string[];
    blockNumber: number;
  }): Promise<{
    [walletAddress: string]: UnipoolBalance;
  }>;

  getUserPowerBalanceUpdatedAfterTimestamp(params: {
    timestamp: number;
    blockNumber: number;
    take: number;
    skip: number;
  }): Promise<{ [address: string]: UnipoolBalance }>;

  getLatestIndexedBlockInfo(): Promise<BlockInfo>;
}
