import { SuperFluidAdapterInterface } from './superFluidAdapterInterface';

export class SuperFluidMockAdapter implements SuperFluidAdapterInterface {
  async streamPeriods(params: {
    address: string;
    chain: number;
    start: number;
    end: number;
    priceGranularity: string;
    virtualization: string;
    currency: string;
  }) {
    return;
  }

  async accountBalance(accountId: number, network: string) {
    return;
  }
}
