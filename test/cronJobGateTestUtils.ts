import { assert } from 'chai';
import sinon from 'sinon';
import cron from 'node-cron';

// Every value other than the exact string 'true' must leave a job disabled.
export const CRON_JOB_DISABLED_ENV_VALUES = [
  'TRUE',
  'True',
  '1',
  'yes',
  'on',
  '',
  ' true',
];

export interface CronJobGateTestParams {
  // The ENABLE_* variable that switches the job on.
  envKey: string;
  // The job's run function (the one bootstrap calls).
  run: () => void | Promise<void>;
  // Runs inside beforeEach after cron.schedule is stubbed; create any extra
  // stubs the job's enabled path needs here (sinon.restore() cleans them up).
  setup?: () => void;
  // Extra assertions after run() with the switch set to 'true'.
  assertEnabledSideEffects?: () => void;
  // Extra assertions after run() with the switch off.
  assertDisabledSideEffects?: () => void;
}

/**
 * Shared test cases for the strict opt-in gate every wind-down cron job uses:
 *   describe('runX ENABLE_X gate', cronJobGateTestCases({ envKey, run }));
 */
export function cronJobGateTestCases(
  params: CronJobGateTestParams,
): () => void {
  const { envKey, run } = params;
  return () => {
    let originalValue: string | undefined;
    let scheduleStub: sinon.SinonStub;

    beforeEach(() => {
      originalValue = process.env[envKey];
      scheduleStub = sinon.stub(cron, 'schedule');
      params.setup?.();
    });

    afterEach(() => {
      sinon.restore();
      if (originalValue === undefined) {
        delete process.env[envKey];
      } else {
        process.env[envKey] = originalValue;
      }
    });

    it('should not schedule when the variable is undefined', async () => {
      delete process.env[envKey];

      await run();

      assert.isTrue(scheduleStub.notCalled);
      params.assertDisabledSideEffects?.();
    });

    it('should not schedule when the variable is "false"', async () => {
      process.env[envKey] = 'false';

      await run();

      assert.isTrue(scheduleStub.notCalled);
      params.assertDisabledSideEffects?.();
    });

    it('should schedule when the variable is "true"', async () => {
      process.env[envKey] = 'true';

      await run();

      assert.isTrue(scheduleStub.calledOnce);
      assert.isString(scheduleStub.firstCall.args[0]);
      assert.isFunction(scheduleStub.firstCall.args[1]);
      params.assertEnabledSideEffects?.();
    });

    it('should not schedule for any other value', async () => {
      for (const value of CRON_JOB_DISABLED_ENV_VALUES) {
        process.env[envKey] = value;

        await run();

        assert.isTrue(scheduleStub.notCalled, `value: "${value}"`);
        params.assertDisabledSideEffects?.();
      }
    });

    it('should not register a scheduled task in node-cron when disabled', async () => {
      scheduleStub.restore();
      delete process.env[envKey];
      const tasksBefore = cron.getTasks().size;

      await run();

      assert.equal(cron.getTasks().size, tasksBefore);
    });
  };
}
