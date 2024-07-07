// import Axios from 'axios';
// import axiosRetry from 'axios-retry';
// import { logger } from '../utils/logger';
// import { NETWORK_IDS } from '../provider';
//
// const givPricesUrl = process.env.GIVETH_GIV_PRICES_URL as string;
//
// // Maximum timeout of axios.
// const axiosTimeout = 20000;
//
// // Handle API timeouts and internal server errors with a retry + delay
// axiosRetry(Axios, {
//   retries: 3,
//   retryDelay: retryCount => {
//     logger.debug(`Axios Retry attempt: ${retryCount}`);
//     return retryCount * 1000; // time interval between retries
//   },
//   retryCondition: error => {
//     if (!error?.response?.status) return true;
//     return error.response?.status === 500;
//   },
// });
//
// export interface GivPricesResponse {
//   givPriceInEth: number;
//   ethPriceInUsd: number;
//   givPriceInUsd: number;
// }

// export const fetchGivHistoricPrice = async (
//   txHash: string,
//   networkId: number,
// ): Promise<GivPricesResponse> => {
//   try {
//     const network = networkId === NETWORK_IDS.MAIN_NET ? 'mainnet' : 'xdai';
//     /**
//      * @see {@link https://givback.develop.giveth.io/api-docs/#/default/get_givPrice}
//      */
//     const result = await Axios.get(givPricesUrl, {
//       headers: { accept: 'application/json' },
//       params: {
//         txHash,
//         network,
//       },
//       timeout: axiosTimeout,
//     });
//     return result.data;
//   } catch (e) {
//     logger.error('fetching Giv Historic Price fetchGivHistoricPrice() err', e);
//     throw e;
//   }
// };

// export const fetchGivPrice = async (): Promise<GivPricesResponse> => {
//   try {
//     /**
//      * @see {@link https://givback.develop.giveth.io/api-docs/#/default/get_givPrice}
//      */
//     const result = await Axios.get(givPricesUrl, {
//       headers: { accept: 'application/json' },
//       timeout: axiosTimeout,
//     });
//     return result.data;
//   } catch (e) {
//     logger.error('fetching Giv Price fetchGivPrice() err', e);
//     throw e;
//   }
// };
