import { getGlobalConfigurationValues } from '../repositories/globalConfigurationRepository';

export interface GlobalScoreSettings {
  globalMinimumPassportScore: number | null;
  globalMinimumMBDScore: number | null;
}

export const getGlobalScoreSettings =
  async (): Promise<GlobalScoreSettings> => {
    const configs = await getGlobalConfigurationValues([
      'GLOBAL_MINIMUM_PASSPORT_SCORE',
      'GLOBAL_MINIMUM_MBD_SCORE',
    ]);

    return {
      globalMinimumPassportScore: configs.GLOBAL_MINIMUM_PASSPORT_SCORE
        ? parseFloat(configs.GLOBAL_MINIMUM_PASSPORT_SCORE)
        : null,
      globalMinimumMBDScore: configs.GLOBAL_MINIMUM_MBD_SCORE
        ? parseFloat(configs.GLOBAL_MINIMUM_MBD_SCORE)
        : null,
    };
  };

export const getEffectiveMinimumPassportScore = async (
  qfRoundMinimumPassportScore: number,
): Promise<number> => {
  const globalSettings = await getGlobalScoreSettings();

  // Use global setting if available, otherwise fall back to QF round setting
  return globalSettings.globalMinimumPassportScore !== null
    ? globalSettings.globalMinimumPassportScore
    : qfRoundMinimumPassportScore;
};

export const getEffectiveMinimumMBDScore = async (
  qfRoundMinMBDScore: number | null,
): Promise<number | null> => {
  const globalSettings = await getGlobalScoreSettings();

  // Use global setting if available, otherwise fall back to QF round setting
  return globalSettings.globalMinimumMBDScore !== null
    ? globalSettings.globalMinimumMBDScore
    : qfRoundMinMBDScore;
};
