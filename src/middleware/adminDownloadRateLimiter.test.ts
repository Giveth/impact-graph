import { assert } from 'chai';
import { Request, Response } from 'express';
import { MemoryStore } from 'express-rate-limit';
import sinon from 'sinon';
import { createAdminDownloadRateLimiter } from './adminDownloadRateLimiter';

describe('admin download rate limiter', () => {
  let store: MemoryStore;
  let limiter: ReturnType<typeof createAdminDownloadRateLimiter>;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    store = new MemoryStore();
    limiter = createAdminDownloadRateLimiter(store);
  });

  afterEach(() => {
    store.shutdown();
    clock.restore();
  });

  const request = async (ip = '192.0.2.1', filename = 'emails.csv') => {
    const req = {
      ip,
      headers: {},
      app: { get: () => false },
      method: 'GET',
      originalUrl: `/admin/download/${filename}`,
    } as unknown as Request;
    const res = {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
      setHeader: sinon.stub(),
    };
    const next = sinon.stub();
    await limiter(req, res as unknown as Response, next);
    return { res, next };
  };

  it('stops excess requests before downstream authentication or file access', async () => {
    for (let i = 0; i < 10; i++) {
      const { next } = await request();
      assert.isTrue(next.calledOnceWithExactly());
    }

    const { res, next } = await request();
    assert.isFalse(next.called);
    assert.isTrue(res.status.calledOnceWithExactly(429));
    assert.isTrue(res.send.calledOnce);
    assert.isTrue(res.setHeader.calledWith('Retry-After', '60'));
  });

  it('shares the quota across filenames while allowing a different IP', async () => {
    for (let i = 0; i < 10; i++) await request();

    const sameIp = await request('192.0.2.1', 'projects.csv');
    assert.isFalse(sameIp.next.called);
    assert.isTrue(sameIp.res.status.calledOnceWithExactly(429));

    const otherIp = await request('192.0.2.2');
    assert.isTrue(otherIp.next.calledOnceWithExactly());
  });

  it('allows requests again after the one-minute window expires', async () => {
    for (let i = 0; i < 10; i++) await request();
    assert.isFalse((await request()).next.called);

    clock.tick(60 * 1000);

    const { res, next } = await request();
    assert.isTrue(next.calledOnceWithExactly());
    assert.isFalse(res.status.called);
  });
});
