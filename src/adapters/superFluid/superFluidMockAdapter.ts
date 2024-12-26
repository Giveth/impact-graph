import {
  FlowUpdatedEvent,
  SuperFluidAdapterInterface,
} from './superFluidAdapterInterface';
import { generateRandomString } from '../../utils/utils';

export class SuperFluidMockAdapter implements SuperFluidAdapterInterface {
  async streamPeriods() {
    return {
      id: '0x8c3bf3eb2639b2326ff937d041292da2e79adbbf-0xd964ab7e202bab8fbaa28d5ca2b2269a5497cf68-0x1305f6b6df9dc47159d12eb7ac2804d4a33173c2-0.0-0.0',
      flowRate: '462962962962962',
      startedAtTimestamp: '1617118948',
      startedAtBlockNumber: '12658248',
      stoppedAtTimestamp: '1626702963',
      stoppedAtBlockNumber: '17035432',
      totalAmountStreamed: '4437043981481472252430',
      chainId: 137,
      token: {
        id: '0x1305f6b6df9dc47159d12eb7ac2804d4a33173c2',
        symbol: 'DAIx',
        name: 'Super DAI (PoS)',
        underlyingAddress: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
      },
      sender: '0x8c3bf3eb2639b2326ff937d041292da2e79adbbf',
      receiver: '0xd964ab7e202bab8fbaa28d5ca2b2269a5497cf68',
      startedAtEvent:
        '0x241d2db890d58d2d9980ad214580c4f3ea22021e2b8dd89387a6257fceebef9d',
      stoppedAtEvent:
        '0x4d8e9edec495fdcdeece9061267f7eef1a96923378c8940ca5ab09439d08d2fd',
      virtualPeriods: [
        {
          startTime: 1617249600,
          endTime: 1619827199,
          amount: '-1193332870370367888200',
          amountFiat: '-1193.9934002402638654',
        },
        {
          startTime: 1619827200,
          endTime: 1622505599,
          amount: '-1239999537037034457800',
          amountFiat: '-1241.1103421307001618',
        },
        {
          startTime: 1622505600,
          endTime: 1625097599,
          amount: '-1199999537037034541000',
          amountFiat: '-1202.7360631768932664',
        },
        {
          startTime: 1625097600,
          endTime: 1626702963,
          amount: '-743223611111109565210',
          amountFiat: '-745.57117099624968902',
        },
      ],
    };
  }

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
    networkId: number;
  }): Promise<FlowUpdatedEvent | undefined> {
    return Promise.resolve(undefined);
  }

  getFlowByTxHash(params: {
    receiver: string;
    sender: string;
    flowRate: string;
    transactionHash: string;
    networkId: number;
  }): Promise<FlowUpdatedEvent | undefined> {
    const { receiver, sender, flowRate, transactionHash } = params;
    return Promise.resolve({
      id: generateRandomString(20),
      flowOperator: 'flowOperator',
      flowRate,
      transactionHash,
      receiver,
      sender,
      token: '',
      timestamp: String(new Date().getTime()),
    });
  }
}
