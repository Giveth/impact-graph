import { GivPowerSubgraphInterface } from './givPowerSubgraphInterface';
import { sleep } from '../../utils/utils';

export class GivPowerSubgraphMock implements GivPowerSubgraphInterface {
  async getUserPowerBalanceInBlockNumber(params: {
    walletAddresses: string[];
    blockNumber: number;
  }): Promise<{ [p: string]: number }> {
    const result = {};
    params.walletAddresses.forEach(walletAddress => {
      result[walletAddress] = Math.floor(Math.random() * 1000);
    });

    // To simulate real adapter condition
    await sleep(10);
    return Promise.resolve(result);
  }
}
