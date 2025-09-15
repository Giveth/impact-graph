import { Field, ObjectType, Query, Resolver, Float } from 'type-graphql';
import { getGlobalConfigurationValues } from '../repositories/globalConfigurationRepository';

@ObjectType()
export class GlobalScoreSettings {
  @Field(_type => Float, { nullable: true })
  globalMinimumPassportScore: number | null;

  @Field(_type => Float, { nullable: true })
  globalMinimumMBDScore: number | null;
}

@Resolver()
export class GlobalConfigurationResolver {
  @Query(_returns => GlobalScoreSettings, { nullable: true })
  async globalScoreSettings(): Promise<GlobalScoreSettings> {
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
  }
}
