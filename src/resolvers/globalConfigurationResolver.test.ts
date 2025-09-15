import { expect } from 'chai';
import { GlobalConfiguration } from '../entities/globalConfiguration';
import { GlobalConfigurationResolver } from './globalConfigurationResolver';

describe('GlobalConfigurationResolver', () => {
  let resolver: GlobalConfigurationResolver;

  beforeEach(async () => {
    resolver = new GlobalConfigurationResolver();
    // Clean up before each test
    await GlobalConfiguration.clear();
  });

  describe('globalScoreSettings', () => {
    it('should return null values when no global configurations exist', async () => {
      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: null,
        globalMinimumMBDScore: null,
      });
    });

    it('should return null values when configurations exist but are inactive', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '0.5',
        isActive: false,
      }).save();

      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.3',
        isActive: false,
      }).save();

      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: null,
        globalMinimumMBDScore: null,
      });
    });

    it('should return correct values when configurations exist and are active', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '0.5',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.3',
        isActive: true,
      }).save();

      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: 0.5,
        globalMinimumMBDScore: 0.3,
      });
    });

    it('should return partial values when only one configuration exists', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '0.5',
        isActive: true,
      }).save();

      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: 0.5,
        globalMinimumMBDScore: null,
      });
    });

    it('should handle invalid numeric values gracefully', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: 'invalid_number',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.3',
        isActive: true,
      }).save();

      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: null, // invalid number
        globalMinimumMBDScore: 0.3,
      });
    });

    it('should handle empty string values', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.3',
        isActive: true,
      }).save();

      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: null, // empty string
        globalMinimumMBDScore: 0.3,
      });
    });

    it('should handle zero values correctly', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '0',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.0',
        isActive: true,
      }).save();

      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: 0,
        globalMinimumMBDScore: 0,
      });
    });

    it('should handle negative values correctly', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '-0.1',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '-0.2',
        isActive: true,
      }).save();

      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: -0.1,
        globalMinimumMBDScore: -0.2,
      });
    });

    it('should handle very large values correctly', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '999.999',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '1000.0',
        isActive: true,
      }).save();

      const result = await resolver.globalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: 999.999,
        globalMinimumMBDScore: 1000.0,
      });
    });
  });
});
