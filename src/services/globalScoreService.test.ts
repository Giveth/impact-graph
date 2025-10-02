import { expect } from 'chai';
import { GlobalConfiguration } from '../entities/globalConfiguration';
import {
  getGlobalScoreSettings,
  getEffectiveMinimumPassportScore,
  getEffectiveMinimumMBDScore,
} from './globalScoreService';

describe('GlobalScoreService', () => {
  beforeEach(async () => {
    // Clean up before each test
    await GlobalConfiguration.clear();
  });

  describe('getGlobalScoreSettings', () => {
    it('should return null values when no global configurations exist', async () => {
      const result = await getGlobalScoreSettings();

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

      const result = await getGlobalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: 0.5,
        globalMinimumMBDScore: 0.3,
      });
    });

    it('should return null values when configurations are inactive', async () => {
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

      const result = await getGlobalScoreSettings();

      expect(result).to.deep.equal({
        globalMinimumPassportScore: null,
        globalMinimumMBDScore: null,
      });
    });
  });

  describe('getEffectiveMinimumPassportScore', () => {
    it('should return QF round score when no global configuration exists', async () => {
      const qfRoundScore = 0.7;
      const result = await getEffectiveMinimumPassportScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore);
    });

    it('should return global score when it exists and is higher than QF round score', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '0.8',
        isActive: true,
      }).save();

      const qfRoundScore = 0.7;
      const result = await getEffectiveMinimumPassportScore(qfRoundScore);

      expect(result).to.equal(0.8);
    });

    it('should return QF round score when it is higher than global score', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '0.5',
        isActive: true,
      }).save();

      const qfRoundScore = 0.7;
      const result = await getEffectiveMinimumPassportScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore);
    });

    it('should return QF round score when global configuration is inactive', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '0.8',
        isActive: false,
      }).save();

      const qfRoundScore = 0.7;
      const result = await getEffectiveMinimumPassportScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore);
    });

    it('should return QF round score when global configuration has invalid value', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: 'invalid_number',
        isActive: true,
      }).save();

      const qfRoundScore = 0.7;
      const result = await getEffectiveMinimumPassportScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore);
    });

    it('should handle zero values correctly', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '0',
        isActive: true,
      }).save();

      const qfRoundScore = 0.7;
      const result = await getEffectiveMinimumPassportScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore); // QF round score is higher
    });

    it('should handle negative global scores', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        value: '-0.1',
        isActive: true,
      }).save();

      const qfRoundScore = 0.7;
      const result = await getEffectiveMinimumPassportScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore); // QF round score is higher
    });
  });

  describe('getEffectiveMinimumMBDScore', () => {
    it('should return QF round score when no global configuration exists', async () => {
      const qfRoundScore = 0.6;
      const result = await getEffectiveMinimumMBDScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore);
    });

    it('should return global score when it exists and is higher than QF round score', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.8',
        isActive: true,
      }).save();

      const qfRoundScore = 0.6;
      const result = await getEffectiveMinimumMBDScore(qfRoundScore);

      expect(result).to.equal(0.8);
    });

    it('should return QF round score when it is higher than global score', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.4',
        isActive: true,
      }).save();

      const qfRoundScore = 0.6;
      const result = await getEffectiveMinimumMBDScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore);
    });

    it('should return QF round score when global configuration is inactive', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.8',
        isActive: false,
      }).save();

      const qfRoundScore = 0.6;
      const result = await getEffectiveMinimumMBDScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore);
    });

    it('should return QF round score when global configuration has invalid value', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: 'invalid_number',
        isActive: true,
      }).save();

      const qfRoundScore = 0.6;
      const result = await getEffectiveMinimumMBDScore(qfRoundScore);

      expect(result).to.equal(qfRoundScore);
    });

    it('should handle equal scores correctly', async () => {
      await GlobalConfiguration.create({
        key: 'GLOBAL_MINIMUM_MBD_SCORE',
        value: '0.6',
        isActive: true,
      }).save();

      const qfRoundScore = 0.6;
      const result = await getEffectiveMinimumMBDScore(qfRoundScore);

      expect(result).to.equal(0.6); // Should return the global score when equal
    });
  });
});
