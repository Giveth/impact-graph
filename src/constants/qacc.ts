import config from '../config';

export const QACC_DONATION_TOKEN_ADDRESS: string = (
  (config.get('QACC_DONATION_TOKEN_ADDRESS') as string) ||
  //https://zkevm.polygonscan.com/token/0x22B21BedDef74FE62F031D2c5c8F7a9F8a4b304D#readContract
  '0x22B21BedDef74FE62F031D2c5c8F7a9F8a4b304D'
).toLowerCase();
export const QACC_DONATION_TOKEN_SYMBOL =
  (config.get('QACC_DONATION_TOKEN_SYMBOL') as string) || 'MATIC';
export const QACC_DONATION_TOKEN_NAME =
  (config.get('QACC_DONATION_TOKEN_NAME') as string) || 'Matic token';
export const QACC_DONATION_TOKEN_DECIMALS =
  (+config.get('QACC_DONATION_TOKEN_DECIMALS') as number) || 18;
export const QACC_DONATION_TOKEN_COINGECKO_ID =
  (config.get('QACC_DONATION_TOKEN_COINGECKO_ID') as string) || 'matic-network';
export const QACC_PRICE_FETCH_LEAD_TIME_IN_SECONDS =
  (+config.get('QACC_PRICE_FETCH_LEAD_TIME_IN_SECONDS') as number) || 300; // 5 minutes
