import Axios from 'axios';
import { logger } from '../utils/logger';

const mpEthSubgraphUrl = process.env.MPETH_GRAPHQL_PRICES_URL as string;

// Maximum timeout of axios.
const axiosTimeout = 20000;

const query = {
  query: `
    {
        tokens(where:{id:"0x819845b60a192167ed1139040b4f8eca31834f27"}) {
            id
            name
            symbol
            decimals
            lastPriceUSD
        }
    }
    `,
};

export const fetchMpEthPrice = async () => {
  try {
    const result = await Axios.post(mpEthSubgraphUrl, query, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: axiosTimeout,
    });
    return Number(result.data.data.tokens[0].lastPriceUSD);
  } catch (e) {
    logger.error('fetching MpEth Price fetchMpEthPrice() err', e);
    throw e;
  }
};
