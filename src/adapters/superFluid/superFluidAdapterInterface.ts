export interface SuperFluidAdapterInterface {
  streamPeriods(params: {
    address: string;
    chain: number;
    start: number;
    end: number;
    priceGranularity: string;
    virtualization: string;
    currency: string;
    recurringDonationTxHash: string;
  }): Promise<any>;
  accountBalance(accountId: string): Promise<any>;
}
