import config from '../config';

export const QACC_DONATION_TOKEN_ADDRESS: string = (
  (config.get('QACC_DONATION_TOKEN_ADDRESS') as string) ||
  // POL token is the native token of Polygon
  '0x0000000000000000000000000000000000000000'
).toLowerCase();
export const QACC_DONATION_TOKEN_SYMBOL =
  (config.get('QACC_DONATION_TOKEN_SYMBOL') as string) || 'POL';
export const QACC_DONATION_TOKEN_NAME =
  (config.get('QACC_DONATION_TOKEN_NAME') as string) || 'POL token';
export const QACC_DONATION_TOKEN_DECIMALS =
  (+config.get('QACC_DONATION_TOKEN_DECIMALS') as number) || 18;
export const QACC_DONATION_TOKEN_COINGECKO_ID =
  (config.get('QACC_DONATION_TOKEN_COINGECKO_ID') as string) ||
  'polygon-ecosystem-token';
export const QACC_PRICE_FETCH_LEAD_TIME_IN_SECONDS =
  (+config.get('QACC_PRICE_FETCH_LEAD_TIME_IN_SECONDS') as number) || 300; // 5 minutes
