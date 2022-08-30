import { GivPowerSubgraphInterface } from './givPowerSubgraphInterface';
import Web3 from 'web3';
import { BigNumber } from '@ethersproject/bignumber';
import { logger } from '../../utils/logger';
import axios from 'axios';

interface GivPowerSnapshot {
  cumulativeGivPowerAmount: string;
  givPowerAmount: string;
  timestamp: string;
}

const givPowerSnapshotQuery = `
  query($walletAddress: String, $fromTimestamp: Int, $toTimestamp: Int) {
    beforeStart: userGivPowerSnapshots(first: 1, where: {user:$walletAddress, timestamp_lte: $fromTimestamp}, orderBy: timestamp, orderDirection: desc) {
      givPowerAmount
      cumulativeGivPowerAmount
      timestamp
      user{id}
    }
    beforeEnd: userGivPowerSnapshots(first: 1, where: {user:$walletAddress, timestamp_lte: $toTimestamp}, orderBy: timestamp, orderDirection: desc) {
      givPowerAmount
      cumulativeGivPowerAmount
      timestamp
       user{id}
    }
  }
`;

const getCumulativePower = (
  timestamp: number,
  [lastSnapShot]: GivPowerSnapshot[],
): BigNumber => {
  if (!lastSnapShot) return BigNumber.from(0);

  return BigNumber.from(lastSnapShot.cumulativeGivPowerAmount).add(
    BigNumber.from(lastSnapShot.givPowerAmount).mul(
      timestamp - Number(lastSnapShot.timestamp),
    ),
  );
};

export const calculateAverage = async (params: {
  subgraphUrl: string;
  walletAddress: string;
  fromTimestamp: number;
  toTimestamp: number;
}): Promise<string> => {
  const { subgraphUrl, walletAddress, fromTimestamp, toTimestamp } = params;
  let result;
  try {
    result = await axios.post(subgraphUrl, {
      query: givPowerSnapshotQuery,
      variables: {
        walletAddress: walletAddress.toLowerCase(),
        fromTimestamp,
        toTimestamp,
      },
    });
  } catch (e) {
    logger.error('calculateAverage error ', {
      e,
      params,
    });
    throw new Error(
      'Can not get data from subgraph, userId' + params.walletAddress,
    );
  }

  const beforeStart: GivPowerSnapshot[] = result.data.data.beforeStart;
  const beforeEnd: GivPowerSnapshot[] = result.data.data.beforeEnd;

  if (fromTimestamp > toTimestamp) return '0';
  if (fromTimestamp === toTimestamp) {
    return beforeEnd.length > 0 ? beforeEnd[0].givPowerAmount : '0';
  }
  const startCumulativePower = getCumulativePower(fromTimestamp, beforeStart);
  const endCumulativePower = getCumulativePower(toTimestamp, beforeEnd);

  return endCumulativePower
    .sub(startCumulativePower)
    .div(toTimestamp - fromTimestamp)
    .toString();
};

export class GivPowerSubgraphAdapter implements GivPowerSubgraphInterface {
  async getUserPowerInTimeRange(params: {
    walletAddress: string;
    fromTimestamp: number;
    toTimestamp: number;
  }): Promise<number> {
    // https://github.com/Giveth/impact-graph/issues/594#issuecomment-1225253740

    const { walletAddress, fromTimestamp, toTimestamp } = params;
    const givPowerSubgraphUrl = process.env.GIV_POWER_SUBGRAPH_URL as string;
    const average = await calculateAverage({
      subgraphUrl: givPowerSubgraphUrl,
      fromTimestamp,
      toTimestamp,
      walletAddress,
    });
    const etherValue = Web3.utils.fromWei(average, 'ether');

    // how many digits should we use for precision?
    return Number(Number(etherValue).toFixed(2));
  }
}
