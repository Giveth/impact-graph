import Axios, { AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import config from '../config';

const givPricesUrl = process.env.GIVETH_GIV_PRICES_URL;

// Maximum timeout of axios.
const axiosTimeout = 20000;

// Handle API timeouts and internal server errors with a retry + delay
axiosRetry(Axios, {
  retries: 3,
  retryDelay: retryCount => {
    console.log(`Axios Retry attempt: ${retryCount}`);
    return retryCount * 1000; // time interval between retries
  },
  retryCondition: error => {
    if (!error?.response?.status) return true;
    return error.response?.status === 500;
  },
});

export interface GivPricesResponse {
  givPriceInEth: number;
  ethPriceInUsd: number;
  givPriceInUsd: number;
}

export const fetchGivHistoricPrice = async (
  txHash: string,
): Promise<GivPricesResponse> => {
  try {
    const result = await Axios.get(`${givPricesUrl}?txHash=${txHash}`, {
      headers: { accept: 'application/json' },
      timeout: axiosTimeout,
    });
    return result.data;
  } catch (e) {
    console.log('fetching Giv Historic Price fetchGivHistoricPrice() err', e);
    throw e;
  }
};
