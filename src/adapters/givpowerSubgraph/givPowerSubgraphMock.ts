import { GivPowerSubgraphInterface } from './givPowerSubgraphInterface';

export class GivPowerSubgraphMock implements GivPowerSubgraphInterface {
  getUserPowerInTimeRange(params: {
    walletAddress: string;
    fromTimestamp: number;
    toTimestamp: number;
  }): Promise<number> {
    return Promise.resolve(Math.floor(Math.random() * 1000));
  }
}
