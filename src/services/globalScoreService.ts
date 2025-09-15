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

    const parseNumericValue = (value: string | null): number | null => {
      if (!value) return null;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };

    return {
      globalMinimumPassportScore: parseNumericValue(
        configs.GLOBAL_MINIMUM_PASSPORT_SCORE,
      ),
      globalMinimumMBDScore: parseNumericValue(
        configs.GLOBAL_MINIMUM_MBD_SCORE,
      ),
    };
  };

export const getEffectiveMinimumPassportScore = async (
  qfRoundMinimumPassportScore: number,
): Promise<number> => {
  const globalSettings = await getGlobalScoreSettings();

  // Use the higher of global setting or QF round setting
  if (
    globalSettings.globalMinimumPassportScore !== null &&
    !isNaN(globalSettings.globalMinimumPassportScore)
  ) {
    return Math.max(
      qfRoundMinimumPassportScore,
      globalSettings.globalMinimumPassportScore,
    );
  }
  return qfRoundMinimumPassportScore;
};

export const getEffectiveMinimumMBDScore = async (
  qfRoundMinimumMBDScore: number,
): Promise<number> => {
  const globalSettings = await getGlobalScoreSettings();

  // Use the higher of global setting or QF round setting
  if (
    globalSettings.globalMinimumMBDScore !== null &&
    !isNaN(globalSettings.globalMinimumMBDScore)
  ) {
    return Math.max(
      qfRoundMinimumMBDScore,
      globalSettings.globalMinimumMBDScore,
    );
  }
  return qfRoundMinimumMBDScore;
};
