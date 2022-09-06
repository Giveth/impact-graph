import { GivPowerSubgraphInterface } from './givPowerSubgraphInterface';

export class GivPowerSubgraphMock implements GivPowerSubgraphInterface {
  getUserPowerInTimeRange(params: {
    walletAddresses: [string];
    fromTimestamp: number;
    toTimestamp: number;
  }): Promise<{ [walletAddress: string]: number }> {
    const result = {};
    params.walletAddresses.forEach(walletAddress => {
      result[walletAddress] = Math.floor(Math.random() * 1000);
    });
    return Promise.resolve(result);
  }
}
