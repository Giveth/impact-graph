import sinon from 'sinon';
import * as utils from '../../utils/utils';
import { cronJobGateTestCases } from '../../../test/cronJobGateTestUtils';
import { runCheckActiveStatusOfQfRounds } from './checkActiveStatusQfRounds';

describe(
  'runCheckActiveStatusOfQfRounds ENABLE_CHECK_QF_ROUND_ACTIVE_STATUS_CRONJOB gate',
  cronJobGateTestCases({
    envKey: 'ENABLE_CHECK_QF_ROUND_ACTIVE_STATUS_CRONJOB',
    run: runCheckActiveStatusOfQfRounds,
    // The job also skips itself under ENVIRONMENT=test; bypass that guard so
    // the flag's enabled path can be observed.
    setup: () => {
      sinon.stub(utils, 'isTestEnv').value(false);
    },
  }),
);
