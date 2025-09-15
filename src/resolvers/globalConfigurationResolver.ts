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

    return {
      globalMinimumPassportScore: configs.GLOBAL_MINIMUM_PASSPORT_SCORE
        ? parseFloat(configs.GLOBAL_MINIMUM_PASSPORT_SCORE)
        : null,
      globalMinimumMBDScore: configs.GLOBAL_MINIMUM_MBD_SCORE
        ? parseFloat(configs.GLOBAL_MINIMUM_MBD_SCORE)
        : null,
    };
  }
}
