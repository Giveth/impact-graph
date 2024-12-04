import config from '../config';

export const GITCOIN_PASSPORT_EXPIRATION_PERIOD_MS =
  (+config.get('GITCOIN_PASSPORT_EXPIRATION_PERIOD_MS') as number) || 86400000; // 1 day
export const GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE =
  (+config.get('GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE') as number) || 50;
export const GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE =
  (+config.get('GITCOIN_PASSPORT_MIN_VALID_SCORER_SCORE') as number) || 15;
