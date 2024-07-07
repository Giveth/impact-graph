import axios from 'axios';
import { logger } from '../../utils/logger';
import { isProduction } from '../../utils/utils';
import {
  FlowUpdatedEvent,
  SuperFluidAdapterInterface,
} from './superFluidAdapterInterface';

const superFluidGraphqlUrl =
  'https://api.thegraph.com/subgraphs/name/superfluid-finance/protocol-v1-optimism-mainnet';
const superFluidGraphqlStagingUrl =
  'https://optimism-sepolia.subgraph.x.superfluid.dev';

const subgraphUrl = isProduction
  ? superFluidGraphqlUrl
  : superFluidGraphqlStagingUrl;

// Define your GraphQL query as a string and prepare your variables
const accountQuery = `
  query getAccountBalances($id: ID!) {
    account(id: $id) {
      id
      accountTokenSnapshots {
        token {
          id
          name
          symbol
        }
        maybeCriticalAtTimestamp 
      }
    }
  }
`;

const getFlowsQuery = `
    query FlowUpdatedEvents($where: FlowUpdatedEvent_filter) {
      flowUpdatedEvents(where: $where) {
        id
        flowOperator
        flowRate
        transactionHash
        receiver
        sender
        token
        timestamp
      }
    }
`;

/* EXAMPLE PAYLOAD
  {
    "id": "0x8c3bf3eb2639b2326ff937d041292da2e79adbbf-0xd964ab7e202bab8fbaa28d5ca2b2269a5497cf68-0x1305f6b6df9dc47159d12eb7ac2804d4a33173c2-0.0-0.0",
    "flowRate": "462962962962962",
    "startedAtTimestamp": "1617118948",
    "startedAtBlockNumber": "12658248",
    "stoppedAtTimestamp": "1626702963",
    "stoppedAtBlockNumber": "17035432",
    "totalAmountStreamed": "4437043981481472252430",
    "chainId": 137,
    "token": {
      "id": "0x1305f6b6df9dc47159d12eb7ac2804d4a33173c2",
      "symbol": "DAIx",
      "name": "Super DAI (PoS)",
      "underlyingAddress": "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063"
    },
    "sender": "0x8c3bf3eb2639b2326ff937d041292da2e79adbbf",
    "receiver": "0xd964ab7e202bab8fbaa28d5ca2b2269a5497cf68",
    "startedAtEvent": "0x241d2db890d58d2d9980ad214580c4f3ea22021e2b8dd89387a6257fceebef9d",
    "stoppedAtEvent": "0x4d8e9edec495fdcdeece9061267f7eef1a96923378c8940ca5ab09439d08d2fd",
    "virtualPeriods": [
      {
        "startTime": 1617249600,
        "endTime": 1619827199,
        "amount": "-1193332870370367888200",
        "amountFiat": "-1193.9934002402638654"
      },
      {
        "startTime": 1619827200,
        "endTime": 1622505599,
        "amount": "-1239999537037034457800",
        "amountFiat": "-1241.1103421307001618"
      },
      {
        "startTime": 1622505600,
        "endTime": 1625097599,
        "amount": "-1199999537037034541000",
        "amountFiat": "-1202.7360631768932664"
      },
      {
        "startTime": 1625097600,
        "endTime": 1626702963,
        "amount": "-743223611111109565210",
        "amountFiat": "-745.57117099624968902"
      }
    ]
  },
*/
export class SuperFluidAdapter implements SuperFluidAdapterInterface {
  async streamPeriods(params: {
    address: string;
    chain: number;
    start: number;
    end: number;
    priceGranularity: string;
    virtualization: string;
    currency: string;
    recurringDonationTxHash: string;
  }) {
    const {
      address,
      chain,
      start,
      end,
      priceGranularity,
      virtualization,
      currency,
      recurringDonationTxHash,
    } = params;
    try {
      const response = await axios.get(
        'https://accounting.superfluid.dev/v1/stream-periods',
        {
          params: {
            addresses: address,
            chains: chain,
            start,
            end,
            priceGranularity,
            virtualization,
            currency,
          },
        },
      );
      // Fetch the stream table with the recurringDonation TxHash
      const filteredData = response.data.filter(streamTable =>
        streamTable.startedAtEvent
          .toLowerCase()
          .includes(recurringDonationTxHash.toLowerCase()),
      );
      return filteredData[0];
    } catch (e) {
      logger.error('superFluidAdaptor.streamPeriods error', e);
    }
  }

  /* RESPONSE
        {
            "data": {
                "account": {
                    "id": "0x0000000000000000000000000000000000000000",
                    "accountTokenSnapshots": [
                        {
                            "token": {
                                "id": "0x01c45fab099f8cda5621d3d97e0978df65706090",
                                "name": "RedCoin"
                            },
                            "maybeCriticalAtTimestamp": null
                        },
                        {
                            "token": {
                                "id": "0x0942570634a80bcd096873afc9b112a900492fd7",
                                "name": "REX Shirt"
                            },
                            "maybeCriticalAtTimestamp": null
                        }
                    ]
                }
            },
    */

  // Optimism works
  async accountBalance(accountId: string) {
    try {
      const response = await axios.post(subgraphUrl, {
        query: accountQuery,
        variables: {
          id: accountId?.toLowerCase(),
        },
      });

      return response.data.data.account?.accountTokenSnapshots;
    } catch (e) {
      logger.error('superFluidAdaptor.accountBalance error', e);
    }
  }

  async getFlowByTxHash(params: {
    receiver: string;
    sender: string;
    flowRate: string;
    transactionHash: string;
  }): Promise<FlowUpdatedEvent | undefined> {
    try {
      const response = await axios.post(subgraphUrl, {
        query: getFlowsQuery,
        variables: {
          where: params,
          orderBy: 'timestamp',
          orderDirection: 'asc',
        },
      });
      const flowUpdates = response.data?.data
        ?.flowUpdatedEvents as FlowUpdatedEvent[];
      return flowUpdates?.[0];
    } catch (e) {
      logger.error('getFlowByReceiverSenderFlowRate error', e);
      throw e;
    }
  }

  async getFlowByReceiverSenderFlowRate(params: {
    receiver: string;
    sender: string;
    flowRate: string;
    timestamp_gt: number;
  }): Promise<FlowUpdatedEvent | undefined> {
    try {
      logger.debug('getFlowByReceiverSenderFlowRate has been called', params);

      const response = await axios.post(subgraphUrl, {
        query: getFlowsQuery,
        variables: {
          where: params,
          orderBy: 'timestamp',
          orderDirection: 'asc',
        },
      });
      const flowUpdates = response.data?.data
        ?.flowUpdatedEvents as FlowUpdatedEvent[];
      return flowUpdates?.[0];
    } catch (e) {
      logger.error('getFlowByReceiverSenderFlowRate error', e);
      throw e;
    }
  }
}
