import Axios, { AxiosResponse } from 'axios';
import config from '../../config';
import { logger } from '../../utils/logger';

const apiBaseUrl = config.get('CHANGE_API_URL') as string;

export const getNonProfit = async (nonProfitName: String) => {
  try {
    const result = await Axios.post(
      `${apiBaseUrl}/v1/nonprofits`,
      {
        public_key: config.get('CHANGE_API_KEYS') as string,
        search_term: nonProfitName,
      },
      {
        headers: { 'Content-Type': `application/json` },
      },
    );
    return result.data.data;
  } catch (e) {
    logger.error('changeAPI service login() err', e);
    throw e;
  }
};
