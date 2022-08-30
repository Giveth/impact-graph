export interface GivPowerSubgraphInterface {
  getUserPowerInTimeRange(params: {
    walletAddress: string;
    fromTimestamp: number;
    toTimestamp: number;
  }): Promise<number>;
}
