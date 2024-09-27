import config from '../config';

export const QACC_DONATION_TOKEN_ADDRESS: string =
  (config.get('QACC_DONATION_TOKEN_ADDRESS') as string) ||
  '0xa2036f0538221a77a3937f1379699f44945018d0'; //https://zkevm.polygonscan.com/token/0xa2036f0538221a77a3937f1379699f44945018d0#readContract
export const QACC_DONATION_TOKEN_SYMBOL =
  (config.get('QACC_DONATION_TOKEN_SYMBOL') as string) || 'MATIC';
export const QACC_DONATION_TOKEN_NAME =
  (config.get('QACC_DONATION_TOKEN_NAME') as string) || 'Matic token';
export const QACC_DONATION_TOKEN_DECIMALS =
  (+config.get('QACC_DONATION_TOKEN_DECIMALS') as number) || 18;
export const QACC_DONATION_TOKEN_COINGECKO_ID =
  (config.get('QACC_DONATION_TOKEN_COINGECKO_ID') as string) || 'matic-network';
