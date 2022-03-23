import Axios, { AxiosResponse } from 'axios';
import config from '../../config';
import { errorMessages } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';

interface ChangeNonProfit {
  address_line?: string;
  category?: string;
  city?: string;
  classification?: string;
  crypto: {
    ethereum_address: string;
    solana_address?: string;
  };
  ein: string;
  icon_url: string;
  id: string;
  mission: string;
  name: string;
  socials: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtuber?: string;
  };
  state?: string;
  website?: string;
  zip_code?: string;
}

// exact title returns 1 element
export const getChangeNonProfitByNameOrIEN = async (
  nonProfit: String,
): Promise<ChangeNonProfit> => {
  try {
    const result = await Axios.get(
      'https://api.getchange.io/api/v1/nonprofits',
      {
        params: {
          public_key: config.get('CHANGE_API_KEYS') as string,
          search_term: nonProfit,
        },
      },
    );

    const nonProfits = result.data.nonprofits;
    if (nonProfits.length > 1) throw errorMessages.CHANGE_API_TITLE_NOT_PRECISE;

    if (nonProfits.length === 0) throw errorMessages.CHANGE_API_INVALID_TITLE;

    return nonProfits[0];
  } catch (e) {
    logger.error('changeAPI service err', e);
    throw e;
  }
};
