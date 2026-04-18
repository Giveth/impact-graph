import { runInNewContext } from 'vm';
import { assert } from 'chai';
import axios from 'axios';
import sinon from 'sinon';
import * as powerBoostingRepository from '../repositories/powerBoostingRepository';
import * as powerSyncCursorRepository from '../repositories/powerSyncCursorRepository';
import * as powerSyncOutboxRepository from '../repositories/powerSyncOutboxRepository';
import { pullGiveconomyPowerSync } from './giveconomyPowerSyncService';

describe('pullGiveconomyPowerSync', () => {
  const originalEnv = {
    GIVECONOMY_POWER_SYNC_URL: process.env.GIVECONOMY_POWER_SYNC_URL,
    POWER_SYNC_PASSWORD: process.env.POWER_SYNC_PASSWORD,
    POWER_SYNC_PASSWORD_HEADER: process.env.POWER_SYNC_PASSWORD_HEADER,
    GIVECONOMY_POWER_SYNC_TIMEOUT_MS:
      process.env.GIVECONOMY_POWER_SYNC_TIMEOUT_MS,
    GIVPOWER_BOOSTING_PERCENTAGE_PRECISION:
      process.env.GIVPOWER_BOOSTING_PERCENTAGE_PRECISION,
  };

  beforeEach(() => {
    process.env.GIVECONOMY_POWER_SYNC_URL =
      'https://giveconomy.example/api/power/sync-events';
    process.env.POWER_SYNC_PASSWORD = 'test-password';
    process.env.POWER_SYNC_PASSWORD_HEADER = 'x-power-sync-password';
    process.env.GIVECONOMY_POWER_SYNC_TIMEOUT_MS = '1000';
    process.env.GIVPOWER_BOOSTING_PERCENTAGE_PRECISION = '2';
  });

  afterEach(() => {
    sinon.restore();

    process.env.GIVECONOMY_POWER_SYNC_URL =
      originalEnv.GIVECONOMY_POWER_SYNC_URL;
    process.env.POWER_SYNC_PASSWORD = originalEnv.POWER_SYNC_PASSWORD;
    process.env.POWER_SYNC_PASSWORD_HEADER =
      originalEnv.POWER_SYNC_PASSWORD_HEADER;
    process.env.GIVECONOMY_POWER_SYNC_TIMEOUT_MS =
      originalEnv.GIVECONOMY_POWER_SYNC_TIMEOUT_MS;
    process.env.GIVPOWER_BOOSTING_PERCENTAGE_PRECISION =
      originalEnv.GIVPOWER_BOOSTING_PERCENTAGE_PRECISION;
  });

  it('rounds mirrored percentages, filters zeros, and bypasses the project limit for mirrored events', async () => {
    sinon.stub(powerSyncCursorRepository, 'getPowerSyncCursor').resolves(null);
    sinon
      .stub(powerSyncCursorRepository, 'savePowerSyncCursor')
      .resolves({} as any);
    sinon
      .stub(powerSyncOutboxRepository, 'getLatestPowerSyncOutboxEventForUser')
      .resolves(null);

    const setMultipleBoostingStub = sinon
      .stub(powerBoostingRepository, 'setMultipleBoosting')
      .resolves([] as any);

    sinon.stub(axios, 'get').resolves({
      status: 200,
      data: {
        data: [
          {
            id: 32,
            sourceSystem: 'giveconomy',
            eventType: 'power-boosting.updated',
            entityType: 'power-boosting',
            userId: 6791,
            sourceUpdatedAt: '2026-04-17T15:38:15.580Z',
            payload: {
              userId: 6791,
              boostings: [
                {
                  projectId: 15674,
                  percentage: 50,
                  updatedAt: '2026-04-17T15:38:15.580Z',
                },
                {
                  projectId: 1443,
                  percentage: 18.6789,
                  updatedAt: '2026-04-17T15:38:15.580Z',
                },
                {
                  projectId: 3173,
                  percentage: 14.754,
                  updatedAt: '2026-04-17T15:38:15.580Z',
                },
                {
                  projectId: 2001,
                  percentage: 0.004,
                  updatedAt: '2026-04-17T15:38:15.580Z',
                },
                {
                  projectId: 2002,
                  percentage: 0,
                  updatedAt: '2026-04-17T15:38:15.580Z',
                },
              ],
            },
          },
        ],
      },
    } as any);

    const result = await pullGiveconomyPowerSync();

    assert.deepEqual(result, {
      fetched: 1,
      applied: 1,
      skipped: 0,
    });
    assert.equal(setMultipleBoostingStub.callCount, 1);

    const params = setMultipleBoostingStub.firstCall.args[0];
    assert.deepEqual(params.projectIds, [15674, 1443, 3173]);
    assert.deepEqual(params.percentages, [50, 18.68, 14.75]);
    assert.isTrue(params.allowZeroTotal);
    assert.isTrue(params.allowPartialTotal);
    assert.isTrue(params.allowExceedProjectLimit);
    assert.isFalse(params.emitOutboxEvent);
    assert.isFunction(params.beforeSave);
  });

  it('normalizes rounded mirrored percentages when they overflow 100 by rounding drift', async () => {
    sinon.stub(powerSyncCursorRepository, 'getPowerSyncCursor').resolves({
      sourceSystem: 'giveconomy',
      lastEventId: 41,
    } as any);
    sinon
      .stub(powerSyncCursorRepository, 'savePowerSyncCursor')
      .resolves({} as any);
    sinon
      .stub(powerSyncOutboxRepository, 'getLatestPowerSyncOutboxEventForUser')
      .resolves(null);

    const setMultipleBoostingStub = sinon
      .stub(powerBoostingRepository, 'setMultipleBoosting')
      .resolves([] as any);

    sinon.stub(axios, 'get').resolves({
      status: 200,
      data: {
        data: [
          {
            id: 42,
            sourceSystem: 'giveconomy',
            eventType: 'power-boosting.updated',
            entityType: 'power-boosting',
            userId: 80,
            sourceUpdatedAt: '2026-04-17T16:41:41.486Z',
            payload: {
              userId: 80,
              boostings: [
                {
                  projectId: 16152,
                  percentage: 12.78654464506554,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 15754,
                  percentage: 10.25772940885481,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 1,
                  percentage: 9.830324016819194,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 15919,
                  percentage: 8.500618352708385,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 2955,
                  percentage: 8.310660400692552,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 2795,
                  percentage: 7.07593371258966,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 2808,
                  percentage: 6.88597576057383,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 2297,
                  percentage: 5.401929260450157,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 2636,
                  percentage: 4.927034380410584,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 1443,
                  percentage: 4.915162008409596,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 3452,
                  percentage: 4.84392777640366,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 3760,
                  percentage: 4.558990848379917,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 16199,
                  percentage: 4,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 1711,
                  percentage: 3.953499876329457,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
                {
                  projectId: 14863,
                  percentage: 3.751669552312638,
                  updatedAt: '2026-04-17T16:41:41.486Z',
                },
              ],
            },
          },
        ],
      },
    } as any);

    const result = await pullGiveconomyPowerSync();

    assert.deepEqual(result, {
      fetched: 1,
      applied: 1,
      skipped: 0,
    });
    assert.equal(setMultipleBoostingStub.callCount, 1);

    const params = setMultipleBoostingStub.firstCall.args[0];
    assert.equal(params.projectIds.length, 15);
    assert.closeTo(
      params.percentages.reduce((sum, value) => sum + value, 0),
      100,
      0.00001,
    );
    assert.equal(params.percentages[0], 12.78);
    assert.equal(params.percentages[1], 10.26);
    assert.equal(params.percentages[14], 3.75);
  });

  it('skips stale mirrored sync events without failing the pull', async () => {
    sinon.stub(powerSyncCursorRepository, 'getPowerSyncCursor').resolves({
      sourceSystem: 'giveconomy',
      lastEventId: 43,
    } as any);
    const savePowerSyncCursorStub = sinon
      .stub(powerSyncCursorRepository, 'savePowerSyncCursor')
      .resolves({} as any);

    sinon
      .stub(powerBoostingRepository, 'setMultipleBoosting')
      .rejects(new Error('STALE_GIVECONOMY_POWER_SYNC_EVENT'));

    sinon.stub(axios, 'get').resolves({
      status: 200,
      data: {
        data: [
          {
            id: 44,
            sourceSystem: 'giveconomy',
            eventType: 'power-boosting.updated',
            entityType: 'power-boosting',
            userId: 6793,
            sourceUpdatedAt: '2026-04-17T16:42:55.129Z',
            payload: {
              userId: 6793,
              boostings: [
                {
                  projectId: 15674,
                  percentage: 100,
                  updatedAt: '2026-04-17T16:42:55.129Z',
                },
              ],
            },
          },
        ],
      },
    } as any);

    const result = await pullGiveconomyPowerSync();

    assert.deepEqual(result, {
      fetched: 1,
      applied: 0,
      skipped: 1,
    });
    assert.equal(savePowerSyncCursorStub.callCount, 1);
    assert.equal(savePowerSyncCursorStub.firstCall.args[0].lastEventId, 44);
  });

  it('skips cross-realm stale mirrored sync events without failing the pull', async () => {
    sinon.stub(powerSyncCursorRepository, 'getPowerSyncCursor').resolves({
      sourceSystem: 'giveconomy',
      lastEventId: 43,
    } as any);
    const savePowerSyncCursorStub = sinon
      .stub(powerSyncCursorRepository, 'savePowerSyncCursor')
      .resolves({} as any);

    sinon
      .stub(powerBoostingRepository, 'setMultipleBoosting')
      .rejects(
        runInNewContext('new Error("STALE_GIVECONOMY_POWER_SYNC_EVENT")'),
      );

    sinon.stub(axios, 'get').resolves({
      status: 200,
      data: {
        data: [
          {
            id: 44,
            sourceSystem: 'giveconomy',
            eventType: 'power-boosting.updated',
            entityType: 'power-boosting',
            userId: 6793,
            sourceUpdatedAt: '2026-04-17T16:42:55.129Z',
            payload: {
              userId: 6793,
              boostings: [
                {
                  projectId: 15674,
                  percentage: 100,
                  updatedAt: '2026-04-17T16:42:55.129Z',
                },
              ],
            },
          },
        ],
      },
    } as any);

    const result = await pullGiveconomyPowerSync();

    assert.deepEqual(result, {
      fetched: 1,
      applied: 0,
      skipped: 1,
    });
    assert.equal(savePowerSyncCursorStub.callCount, 1);
    assert.equal(savePowerSyncCursorStub.firstCall.args[0].lastEventId, 44);
  });
});
