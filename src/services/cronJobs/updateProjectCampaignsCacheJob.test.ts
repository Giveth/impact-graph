import { assert } from 'chai';
import sinon from 'sinon';
import * as campaignService from '../campaignService';
import { cronJobGateTestCases } from '../../../test/cronJobGateTestUtils';
import { runUpdateProjectCampaignsCacheJob } from './updateProjectCampaignsCacheJob';

let cacheStub: sinon.SinonStub;

describe(
  'runUpdateProjectCampaignsCacheJob ENABLE_CACHE_PROJECT_CAMPAIGNS_CRONJOB gate',
  cronJobGateTestCases({
    envKey: 'ENABLE_CACHE_PROJECT_CAMPAIGNS_CRONJOB',
    run: runUpdateProjectCampaignsCacheJob,
    setup: () => {
      cacheStub = sinon
        .stub(campaignService, 'cacheProjectCampaigns')
        .resolves();
    },
    // The job warms the cache once before scheduling.
    assertEnabledSideEffects: () => {
      assert.isTrue(cacheStub.calledOnce);
    },
    assertDisabledSideEffects: () => {
      assert.isTrue(cacheStub.notCalled);
    },
  }),
);
