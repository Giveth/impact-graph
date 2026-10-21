import { assert } from 'chai';
import { isCronJobEnabled, isCronJobEnabledOrLog } from './cronJobEnabled';
import { CRON_JOB_DISABLED_ENV_VALUES } from '../../test/cronJobGateTestUtils';

describe('isCronJobEnabled() test cases', () => {
  const ENV_KEY = 'ENABLE_SOME_TEST_ONLY_CRONJOB';
  let originalValue: string | undefined;

  beforeEach(() => {
    originalValue = process.env[ENV_KEY];
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalValue;
    }
  });

  it('should be false when the variable is undefined', () => {
    delete process.env[ENV_KEY];
    assert.isFalse(isCronJobEnabled(ENV_KEY));
    assert.isFalse(isCronJobEnabledOrLog(ENV_KEY, 'Test'));
  });

  it('should be false when the variable is "false"', () => {
    process.env[ENV_KEY] = 'false';
    assert.isFalse(isCronJobEnabled(ENV_KEY));
    assert.isFalse(isCronJobEnabledOrLog(ENV_KEY, 'Test'));
  });

  it('should be true only for the exact string "true"', () => {
    process.env[ENV_KEY] = 'true';
    assert.isTrue(isCronJobEnabled(ENV_KEY));
    assert.isTrue(isCronJobEnabledOrLog(ENV_KEY, 'Test'));
  });

  it('should be false for any other value', () => {
    for (const value of CRON_JOB_DISABLED_ENV_VALUES) {
      process.env[ENV_KEY] = value;
      assert.isFalse(isCronJobEnabled(ENV_KEY), `value: "${value}"`);
      assert.isFalse(
        isCronJobEnabledOrLog(ENV_KEY, 'Test'),
        `value: "${value}"`,
      );
    }
  });
});
