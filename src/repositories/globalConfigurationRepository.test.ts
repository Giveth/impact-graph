import { expect } from 'chai';
import { GlobalConfiguration } from '../entities/globalConfiguration';
import {
  getGlobalConfigurationValue,
  getGlobalConfigurationValues,
  setGlobalConfigurationValue,
  getAllGlobalConfigurations,
} from './globalConfigurationRepository';

describe('GlobalConfigurationRepository', () => {
  beforeEach(async () => {
    // Clean up before each test
    await GlobalConfiguration.clear();
  });

  describe('getGlobalConfigurationValue', () => {
    it('should return null when key does not exist', async () => {
      const result = await getGlobalConfigurationValue('NON_EXISTENT_KEY');
      expect(result).to.be.null;
    });

    it('should return null when key exists but is inactive', async () => {
      await GlobalConfiguration.create({
        key: 'TEST_KEY',
        value: 'test_value',
        isActive: false,
      }).save();

      const result = await getGlobalConfigurationValue('TEST_KEY');
      expect(result).to.be.null;
    });

    it('should return value when key exists and is active', async () => {
      await GlobalConfiguration.create({
        key: 'TEST_KEY',
        value: 'test_value',
        isActive: true,
      }).save();

      const result = await getGlobalConfigurationValue('TEST_KEY');
      expect(result).to.equal('test_value');
    });

    it('should return "0" when value is the string "0"', async () => {
      await GlobalConfiguration.create({
        key: 'ZERO_KEY',
        value: '0',
        isActive: true,
      }).save();

      const result = await getGlobalConfigurationValue('ZERO_KEY');
      expect(result).to.equal('0');
    });
  });

  describe('getGlobalConfigurationValues', () => {
    it('should return empty object when no keys provided', async () => {
      const result = await getGlobalConfigurationValues([]);
      expect(result).to.deep.equal({});
    });

    it('should return null values for non-existent keys', async () => {
      const result = await getGlobalConfigurationValues(['KEY1', 'KEY2']);
      expect(result).to.deep.equal({
        KEY1: null,
        KEY2: null,
      });
    });

    it('should return values for existing active keys', async () => {
      await GlobalConfiguration.create({
        key: 'KEY1',
        value: 'value1',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'KEY2',
        value: 'value2',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'KEY3',
        value: 'value3',
        isActive: false,
      }).save();

      const result = await getGlobalConfigurationValues([
        'KEY1',
        'KEY2',
        'KEY3',
        'KEY4',
      ]);
      expect(result).to.deep.equal({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: null, // inactive
        KEY4: null, // doesn't exist
      });
    });
  });

  describe('setGlobalConfigurationValue', () => {
    it('should create new configuration when key does not exist', async () => {
      const result = await setGlobalConfigurationValue('NEW_KEY', 'new_value');
      expect(result).to.not.be.null;
      expect(result.key).to.equal('NEW_KEY');
      expect(result.value).to.equal('new_value');
      expect(result.isActive).to.be.true;
    });

    it('should update existing configuration', async () => {
      await GlobalConfiguration.create({
        key: 'EXISTING_KEY',
        value: 'old_value',
        isActive: true,
      }).save();

      const result = await setGlobalConfigurationValue(
        'EXISTING_KEY',
        'new_value',
      );
      expect(result).to.not.be.null;
      expect(result.value).to.equal('new_value');
    });

    it('should create configuration with description and type', async () => {
      const result = await setGlobalConfigurationValue(
        'NEW_KEY_WITH_META',
        'new_value',
        'Test description',
        'string',
      );
      expect(result).to.not.be.null;
      expect(result.key).to.equal('NEW_KEY_WITH_META');
      expect(result.value).to.equal('new_value');
      expect(result.description).to.equal('Test description');
      expect(result.type).to.equal('string');
    });
  });

  describe('getAllGlobalConfigurations', () => {
    it('should return all active configurations', async () => {
      await GlobalConfiguration.create({
        key: 'CONFIG1',
        value: 'value1',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'CONFIG2',
        value: 'value2',
        isActive: true,
      }).save();

      await GlobalConfiguration.create({
        key: 'CONFIG3',
        value: 'value3',
        isActive: false,
      }).save();

      const result = await getAllGlobalConfigurations();
      expect(result).to.have.length(2);
      expect(result.every(config => config.isActive)).to.be.true;
    });

    it('should return empty array when no configurations exist', async () => {
      const result = await getAllGlobalConfigurations();
      expect(result).to.have.length(0);
    });
  });
});
