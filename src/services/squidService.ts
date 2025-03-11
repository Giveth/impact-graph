import axios from 'axios';
import config from '../config';
import { logger } from '../utils/logger';
const integratorId: string = config.get('SQUID_INTEGRATOR_ID') as string;

export const getStatus = async (params: {
  transactionId: string;
  requestId: string;
  fromChainId: string;
  toChainId: string;
}) => {
  try {
    const result = await axios.get(
      'https://apiplus.squidrouter.com/v2/status',
      {
        params,
        headers: {
          'x-integrator-id': integratorId,
        },
      },
    );
    return result.data;
  } catch (error: any) {
    if (error.response) {
      logger.error('API error:', error.response.data);
    }
    logger.error('Error with parameters:', params);
    throw error;
  }
};
