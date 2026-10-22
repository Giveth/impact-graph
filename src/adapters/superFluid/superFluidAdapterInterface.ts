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

// One stream as returned by https://accounting.superfluid.dev/v1/stream-periods
// (one element of the response array). Verified against a live response:
// sender/receiver are plain lowercase addresses, timestamps are decimal
// strings, chainId is a number. Only the fields the backend reads are listed.
export interface SuperFluidStreamPeriod {
  id: string;
  flowRate: string;
  startedAtTimestamp: string;
  startedAtBlockNumber?: string;
  stoppedAtTimestamp: string | null;
  stoppedAtBlockNumber?: string | null;
  totalAmountStreamed?: string;
  chainId: number;
  token: {
    id: string;
    symbol: string;
    name?: string;
    underlyingAddress?: string;
  };
  sender: string;
  receiver: string;
  startedAtEvent: string;
  stoppedAtEvent: string | null;
  virtualPeriods: Array<{
    startTime: number;
    endTime: number;
    amount: string;
    amountFiat: string;
  }>;
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
  }): Promise<SuperFluidStreamPeriod | undefined>;
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
