import config from '../config';

export const ANKR_FETCH_START_TIMESTAMP =
  (+config.get('ANKR_FETCH_START_TIMESTAMP') as number) ||
  Math.floor(Date.now() / 1000);

export const ANKR_RPC_URL: string | undefined = config.get('ANKR_RPC_URL') as
  | string
  | undefined;
