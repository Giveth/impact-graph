import BigNumber from 'bignumber.js';
import axios from 'axios';
import {
  BlockInfo,
  IGivPowerSubgraphAdapter,
  UnipoolBalance,
} from './IGivPowerSubgraphAdapter';

const _toBN = (n: string | number) => new BigNumber(n);
export const formatGivPowerBalance = (balance: string | number): number =>
  Number(
    _toBN(balance)
      .div(10 ** 18)
      .toFixed(2),
  );

const getPowerBalanceInBlockQuery = (params: {
  addresses: Set<string>;
  blockNumber: number;
  unipoolContractId: string;
}): string => {
  const { addresses, blockNumber, unipoolContractId } = params;
  const usersIn =
    '[' +
    Array.from(addresses)
      .map(address => `"${address}"`)
      .join(',') +
    ']';
  return `query {
    unipoolBalances(
      first: ${addresses.size}
    where: {
      unipool: "${unipoolContractId.toLowerCase()}",
        user_in: ${usersIn.toLowerCase()}
    },
    block: {number:${blockNumber} }
  ) {
      balance
      updatedAt
      user {
        id
      }
    }
  }`;
};

const getPowerBalancesUpdatedAfterTimestampQuery = (params: {
  timestamp: number;
  blockNumber: number;
  unipoolContractId: string;
  take: number;
  skip: number;
}): string => {
  const { timestamp, blockNumber, unipoolContractId, take, skip } = params;
  return `query {
    unipoolBalances(
      first: ${take}
      skip: ${skip}
      orderBy: updatedAt
      orderDirection: asc
      where: {
        unipool: "${unipoolContractId.toLowerCase()}",
        updatedAt_gt: ${timestamp}
      },
      block: {number:${blockNumber} }
    ) {
      balance
      updatedAt
      user {
        id
      }
    }
  }`;
};

export class GivPowerSubgraphAdapter implements IGivPowerSubgraphAdapter {
  async getUserPowerBalanceAtBlockNumber(params: {
    walletAddresses: string[];
    blockNumber: number;
  }): Promise<{ [address: string]: UnipoolBalance }> {
    const { walletAddresses, blockNumber } = params;
    const givPowerSubgraphUrl = process.env.GIV_POWER_SUBGRAPH_URL as string;
    const unipoolContractId = process.env
      .GIV_POWER_UNIPOOL_CONTRACT_ID as string;
    const response = await axios.post(givPowerSubgraphUrl, {
      query: getPowerBalanceInBlockQuery({
        addresses: new Set(walletAddresses),
        blockNumber,
        unipoolContractId,
      }),
    });
    const unipoolBalances = response.data.data.unipoolBalances;
    const result: { [address: string]: UnipoolBalance } = {};
    unipoolBalances.forEach(unipoolBalance => {
      const walletAddress = unipoolBalance.user.id;
      result[walletAddress] = {
        balance: formatGivPowerBalance(unipoolBalance.balance),
        updatedAt: unipoolBalance.updatedAt,
      };
    });
    walletAddresses.forEach(address => {
      if (!result[address]) {
        result[address] = {
          balance: 0,
          updatedAt: 0,
        };
      }
    });
    return result;
  }

  async getUserPowerBalanceUpdatedAfterTimestamp(params: {
    timestamp: number;
    blockNumber: number;
    take: number;
    skip: number;
  }): Promise<{ [address: string]: UnipoolBalance }> {
    const givPowerSubgraphUrl = process.env.GIV_POWER_SUBGRAPH_URL as string;
    const unipoolContractId = process.env
      .GIV_POWER_UNIPOOL_CONTRACT_ID as string;
    const query = getPowerBalancesUpdatedAfterTimestampQuery({
      ...params,
      unipoolContractId,
    });
    const response = await axios.post(givPowerSubgraphUrl, {
      query,
    });
    const unipoolBalances = response.data.data.unipoolBalances;
    const result: { [address: string]: UnipoolBalance } = {};
    unipoolBalances.forEach(unipoolBalance => {
      const walletAddress = unipoolBalance.user.id;
      result[walletAddress] = {
        balance: formatGivPowerBalance(unipoolBalance.balance),
        updatedAt: unipoolBalance.updatedAt,
      };
    });
    return result;
  }

  async getLatestIndexedBlockInfo(): Promise<BlockInfo> {
    const givPowerSubgraphUrl = process.env.GIV_POWER_SUBGRAPH_URL as string;

    const response = await axios.post(givPowerSubgraphUrl, {
      query: `query {
      _meta {
        block {
          number
          timestamp
        }
      }
  }`,
    });
    return response.data.data._meta.block;
  }
}
