export interface GivPowerSubgraphInterface {
  getUserPowerBalanceInBlockNumber(params: {
    walletAddresses: string[];
    blockNumber: number;
  }): Promise<{ [walletAddress: string]: number }>;
}
