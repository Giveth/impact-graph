export interface FlowUpdatedEvent {
  id: string;
  flowOperator: string;
  flowRate: string;
  transactionHash: string;
  receiver: string;
  sender: string;
  token: string;
  timestamp: string;
}

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
  accountBalance(accountId: string, networkId: number): Promise<any>;
  getFlowByTxHash(params: {
    receiver: string;
    sender: string;
    flowRate: string;
    transactionHash: string;
    networkId: number;
  }): Promise<FlowUpdatedEvent | undefined>;
  getFlowByReceiverSenderFlowRate(params: {
    receiver: string;
    sender: string;
    flowRate: string;
    timestamp_gt: number;
    networkId: number;
  }): Promise<FlowUpdatedEvent | undefined>;
}
