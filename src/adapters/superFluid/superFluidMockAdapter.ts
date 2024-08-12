import {
  FlowUpdatedEvent,
  SuperFluidAdapterInterface,
} from './superFluidAdapterInterface';

export class SuperFluidMockAdapter implements SuperFluidAdapterInterface {
  async accountBalance() {
    return {
      id: '0x0000000000000000000000000000000000000000',
      accountTokenSnapshots: [
        {
          token: {
            id: '0x01c45fab099f8cda5621d3d97e0978df65706090',
            name: 'ETHx',
            symbol: 'ETHx',
          },
          maybeCriticalAtTimestamp: 1738525894,
        },
        {
          token: {
            id: '0x0942570634a80bcd096873afc9b112a900492fd7',
            name: 'Daix',
            symbol: 'Daix',
          },
          maybeCriticalAtTimestamp: 1738525894,
        },
      ],
    };
  }

  getFlowByReceiverSenderFlowRate(_params: {
    receiver: string;
    sender: string;
    flowRate: string;
    timestamp_gt: number;
  }): Promise<FlowUpdatedEvent | undefined> {
    return Promise.resolve(undefined);
  }

  getFlowByTxHash(_params: {
    receiver: string;
    sender: string;
    flowRate: string;
    transactionHash: string;
  }): Promise<FlowUpdatedEvent | undefined> {
    return Promise.resolve(undefined);
  }
}
