import { GivPowerSubgraphInterface } from './givPowerSubgraphInterface';
import BigNumber from 'bignumber.js';
import axios from 'axios';

const _toBN = (n: string | number) => new BigNumber(n);

const _queryBuilder = (params: {
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
      user {
        id
      }
    }
  }`;
};

export class GivPowerSubgraphAdapter implements GivPowerSubgraphInterface {
  async getUserPowerBalanceInBlockNumber(params: {
    walletAddresses: string[];
    blockNumber: number;
  }): Promise<{ [p: string]: number }> {
    const { walletAddresses, blockNumber } = params;
    const givPowerSubgraphUrl = process.env.GIV_POWER_SUBGRAPH_URL as string;
    const unipoolContractId = process.env
      .GIV_POWER_UNIPOOL_CONTRACT_ID as string;
    const response = await axios.post(givPowerSubgraphUrl, {
      query: _queryBuilder({
        addresses: new Set(walletAddresses),
        blockNumber,
        unipoolContractId,
      }),
    });
    const balances = response.data.data.unipoolBalances;
    const result = {};
    walletAddresses.forEach(walletAddress => {
      const balance = balances.find(b => b.user.id === walletAddress)?.balance;
      result[walletAddress] = balance
        ? Number(
            _toBN(balance)
              .div(10 ** 18)
              .toFixed(2),
          )
        : 0;
    });
    return result;
  }
}
