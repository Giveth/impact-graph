import { GivPowerSubgraphInterface } from './givPowerSubgraphInterface';
import { sleep } from '../../utils/utils';

export class GivPowerSubgraphMock implements GivPowerSubgraphInterface {
  async getUserPowerInTimeRange(params: {
    walletAddresses: string[];
    fromTimestamp: number;
    toTimestamp: number;
  }): Promise<{ [walletAddress: string]: number }> {
    const result = {};
    params.walletAddresses.forEach(walletAddress => {
      result[walletAddress] = Math.floor(Math.random() * 1000);
    });

    // To simulate real adapter condition
    await sleep(50);
    return Promise.resolve(result);
  }
}
