export interface GivPowerSubgraphInterface {
  getUserPowerInTimeRange(params: {
    walletAddresses: string[];
    fromTimestamp: number;
    toTimestamp: number;
  }): Promise<{ [walletAddress: string]: number }>;
}
