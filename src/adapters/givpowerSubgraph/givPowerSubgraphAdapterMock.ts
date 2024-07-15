import {
  IGivPowerSubgraphAdapter,
  BlockInfo,
  UnipoolBalance,
} from './IGivPowerSubgraphAdapter.js';
import { sleep } from '../../utils/utils.js';

export class GivPowerSubgraphAdapterMock implements IGivPowerSubgraphAdapter {
  nextCallResult: any = null;
  async getUserPowerBalanceAtBlockNumber(params: {
    walletAddresses: string[];
    blockNumber: number;
  }): Promise<{ [p: string]: UnipoolBalance }> {
    if (this.nextCallResult) {
      const customResult = this.nextCallResult;
      this.nextCallResult = null;
      return Promise.resolve(customResult);
    }
    const result: { [address: string]: UnipoolBalance } = {};
    params.walletAddresses.forEach(walletAddress => {
      result[walletAddress] = {
        balance: Math.floor(Math.random() * 1000),
        updatedAt: Math.floor(Math.random() * 1000),
      };
    });

    // To simulate real adapter condition
    await sleep(10);
    return Promise.resolve(result);
  }

  getLatestIndexedBlockInfo(): Promise<BlockInfo> {
    if (this.nextCallResult) {
      const customResult = this.nextCallResult;
      this.nextCallResult = null;
      return Promise.resolve(customResult);
    }
    return Promise.resolve({ timestamp: 1000, number: 1000 });
  }

  getUserPowerBalanceUpdatedAfterTimestamp(): Promise<{
    [p: string]: UnipoolBalance;
  }> {
    if (this.nextCallResult) {
      const customResult = this.nextCallResult;
      this.nextCallResult = null;
      return Promise.resolve(customResult);
    }
    return Promise.resolve({});
  }
}
