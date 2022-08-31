import axios from 'axios';
import { logger } from '../../utils/logger';

export interface PoignArtWithdrawal {
  amount: number;
  timestamp: number;
  blockNumber: number;
  txHash: string;
  recipient: string;
}
export const getPoignArtWithdrawals = async (inputData: {
  recipient: string;
  // It should be seconds NOT milli seconds
  startTimestamp: number;
}): Promise<PoignArtWithdrawal[]> => {
  try {
    const { recipient, startTimestamp } = inputData;
    const graphqlQuery = `{
    withdrawals(
            first:1000,
            orderBy:timestamp,
            orderDirection:asc
            where: {
              recipient:"${recipient.toLowerCase()}"
              timestamp_gte:${startTimestamp}
            }
    ) {
        recipient {
          id
        }
        amount
        transaction {
          id
          timestamp
          blockNumber
        }
      }
    }
  `;
    const result = await axios.post(
      process.env.POIGN_ART_SUBGRAPH_URL as string,
      {
        query: graphqlQuery,
      },
    );
    const withdrawals = result.data.data.withdrawals.map(withdrawal => {
      return {
        amount: Number(withdrawal.amount) / 10 ** 18,
        txHash: withdrawal.transaction.id,
        timestamp: Number(withdrawal.transaction.timestamp),
        blockNumber: Number(withdrawal.transaction.blockNumber),
        recipient: Number(withdrawal.recipient.id),
      };
    });
    return withdrawals;
  } catch (e) {
    logger.error('getPoignArtWithdrawals() error', e);
    throw e;
  }
};
