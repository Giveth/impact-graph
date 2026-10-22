import { assert } from 'chai';
import sinon from 'sinon';
import cron from 'node-cron';
import * as balancesQueue from './checkUserSuperTokenBalancesQueue';
import * as streamQueue from '../recurringDonationStreamQueue';
import { cronJobGateTestCases } from '../../../test/cronJobGateTestUtils';
import { runCheckUserSuperTokenBalancesJob } from './checkUserSuperTokenBalancesJob';
import { runUpdateRecurringDonationStream } from './updateStreamOldRecurringDonationsJob';

const ENV_KEY = 'ENABLE_CHECK_USERS_SUPER_TOKEN_BALANCES_CRONJOB';
let processBalancesStub: sinon.SinonStub;

describe(
  'runCheckUserSuperTokenBalancesJob ENABLE_CHECK_USERS_SUPER_TOKEN_BALANCES_CRONJOB gate',
  cronJobGateTestCases({
    envKey: ENV_KEY,
    run: runCheckUserSuperTokenBalancesJob,
    setup: () => {
      processBalancesStub = sinon.stub(
        balancesQueue,
        'processRecurringDonationBalancesJobs',
      );
    },
    assertEnabledSideEffects: () => {
      assert.isTrue(processBalancesStub.calledOnce);
    },
    assertDisabledSideEffects: () => {
      assert.isTrue(processBalancesStub.notCalled);
    },
  }),
);

describe('runCheckUserSuperTokenBalancesJob independence from the stream job', () => {
  let originalValue: string | undefined;

  beforeEach(() => {
    originalValue = process.env[ENV_KEY];
  });

  afterEach(() => {
    sinon.restore();
    if (originalValue === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalValue;
    }
  });

  it('should leave recurring donation stream bookkeeping unaffected when disabled', () => {
    delete process.env[ENV_KEY];
    const scheduleStub = sinon.stub(cron, 'schedule');
    const balancesStub = sinon.stub(
      balancesQueue,
      'processRecurringDonationBalancesJobs',
    );
    const streamStub = sinon.stub(
      streamQueue,
      'processRecurringDonationStreamJobs',
    );

    runUpdateRecurringDonationStream();

    assert.isTrue(streamStub.calledOnce);
    assert.isTrue(scheduleStub.calledOnce);
    assert.isTrue(balancesStub.notCalled);
  });
});
