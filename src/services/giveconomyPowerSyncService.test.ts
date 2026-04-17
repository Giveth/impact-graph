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
  };

  beforeEach(() => {
    process.env.GIVECONOMY_POWER_SYNC_URL =
      'https://giveconomy.example/api/power/sync-events';
    process.env.POWER_SYNC_PASSWORD = 'test-password';
    process.env.POWER_SYNC_PASSWORD_HEADER = 'x-power-sync-password';
    process.env.GIVECONOMY_POWER_SYNC_TIMEOUT_MS = '1000';
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
  });

  it('filters zero percentages and bypasses the project limit for mirrored events', async () => {
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
                  percentage: 18.6,
                  updatedAt: '2026-04-17T15:38:15.580Z',
                },
                {
                  projectId: 3173,
                  percentage: 14.75,
                  updatedAt: '2026-04-17T15:38:15.580Z',
                },
                {
                  projectId: 2001,
                  percentage: 0,
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
    assert.deepEqual(params.percentages, [50, 18.6, 14.75]);
    assert.isTrue(params.allowZeroTotal);
    assert.isTrue(params.allowPartialTotal);
    assert.isTrue(params.allowExceedProjectLimit);
    assert.isFalse(params.emitOutboxEvent);
    assert.isFunction(params.beforeSave);
  });
});
