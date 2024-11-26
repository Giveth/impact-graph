import config from '../config';

export const GITCOIN_PASSPORT_EXPIRATION_PERIOD_MS =
  (+config.get('GITCOIN_PASSPORT_EXPIRATION_PERIOD_MS') as number) || 86400000; // 1 day
export const GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE =
  (+config.get('GITCOIN_PASSPORT_MIN_VALID_ANALYSIS_SCORE') as number) || 50;
export const MAX_CONTRIBUTION_WITH_GITCOIN_PASSPORT_ONLY =
  (+config.get('MAX_CONTRIBUTION_WITH_GITCOIN_PASSPORT_ONLY') as number) ||
  1000;
