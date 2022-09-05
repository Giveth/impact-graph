import { GivPowerSubgraphInterface } from './givPowerSubgraphInterface';
import BigNumber from 'bignumber.js';
import { logger } from '../../utils/logger';
import axios from 'axios';

interface GivPowerSnapshot {
  cumulativeGivPowerAmount: string;
  givPowerAmount: string;
  timestamp: string;
}

const _toBN = (n: string | number) => new BigNumber(n);
const zeroBN = _toBN(0);

const _getCumulativePower = (
  timestamp: number,
  [lastSnapShot]: GivPowerSnapshot[],
): BigNumber => {
  if (!lastSnapShot) return zeroBN;

  return _toBN(lastSnapShot.cumulativeGivPowerAmount).plus(
    _toBN(lastSnapShot.givPowerAmount).times(
      timestamp - Number(lastSnapShot.timestamp),
    ),
  );
};

const _getBeforeStartKey = walletAddress => `beforeStart_${walletAddress}`;
const _getBeforeEndKey = walletAddress => `beforeEnd_${walletAddress}`;

const _queryBuilder = (
  addressSet: Set<string>,
  fromTimestamp: number,
  toTimestamp: number,
): string => {
  let query = '{\n';
  addressSet.forEach(walletAddress => {
    query += `
    ${_getBeforeStartKey(
      walletAddress,
    )}: userGivPowerSnapshots(first: 1, where: { user:"${walletAddress.toLowerCase()}", timestamp_lte: ${fromTimestamp} }, orderBy: timestamp, orderDirection: desc) {
      givPowerAmount
      cumulativeGivPowerAmount
      timestamp
      user { id }
    }
    ${_getBeforeEndKey(
      walletAddress,
    )}: userGivPowerSnapshots(first: 1, where: { user:"${walletAddress.toLowerCase()}", timestamp_lte: ${toTimestamp} }, orderBy: timestamp, orderDirection: desc) {
      givPowerAmount
      cumulativeGivPowerAmount
      timestamp
      user { id }
    }
  `;
  });
  query += '}';

  return query;
};

export const calculateAverage = async (params: {
  subgraphUrl: string;
  walletAddresses: string[];
  fromTimestamp: number;
  toTimestamp: number;
}): Promise<{ [walletAddresses: string]: BigNumber }> => {
  const { subgraphUrl, walletAddresses, fromTimestamp, toTimestamp } = params;

  const addressSet = new Set(walletAddresses);

  let response;
  try {
    response = await axios.post(subgraphUrl, {
      query: _queryBuilder(addressSet, fromTimestamp, toTimestamp),
    });
  } catch (e) {
    logger.error('calculateAverage error ', {
      e,
      params,
    });
    throw new Error('Can not get data from subgraph');
  }

  const result: { [walletAddresses: string]: BigNumber } = {};

  addressSet.forEach(walletAddress => {
    const beforeStart: GivPowerSnapshot[] =
      response.data.data[_getBeforeStartKey(walletAddress)];
    const beforeEnd: GivPowerSnapshot[] =
      response.data.data[_getBeforeEndKey(walletAddress)];

    let average: BigNumber;
    if (fromTimestamp > toTimestamp) average = zeroBN;
    else if (fromTimestamp === toTimestamp) {
      average =
        beforeEnd.length > 0 ? _toBN(beforeEnd[0].givPowerAmount) : zeroBN;
    } else {
      const startCumulativePower = _getCumulativePower(
        fromTimestamp,
        beforeStart,
      );
      const endCumulativePower = _getCumulativePower(toTimestamp, beforeEnd);
      average = endCumulativePower
        .minus(startCumulativePower)
        .div(toTimestamp - fromTimestamp);
    }
    result[walletAddress] = average;
  });

  return result;
};

export class GivPowerSubgraphAdapter implements GivPowerSubgraphInterface {
  async getUserPowerInTimeRange(params: {
    walletAddresses: string[];
    fromTimestamp: number;
    toTimestamp: number;
  }): Promise<{ [walletAddress: string]: number }> {
    // https://github.com/Giveth/impact-graph/issues/594#issuecomment-1225253740

    const { walletAddresses, fromTimestamp, toTimestamp } = params;
    const givPowerSubgraphUrl = process.env.GIV_POWER_SUBGRAPH_URL as string;
    const averages = await calculateAverage({
      subgraphUrl: givPowerSubgraphUrl,
      walletAddresses,
      fromTimestamp,
      toTimestamp,
    });

    const result: { [walletAddresses: string]: number } = {};
    Object.entries(averages).forEach(([walletAddress, averageBN]) => {
      result[walletAddress] = Number(averageBN.div(10 ** 18).toFixed(2));
    });

    return result;
  }
}
