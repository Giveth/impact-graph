import { rejects as assertRejects } from 'assert';
import { assert } from 'chai';
import sinon from 'sinon';
import { User } from '../entities/user';
import { AppDataSource } from '../orm';
import { redis } from '../redis';
import { UserResolver } from './userResolver';

describe('UserResolver createUserByAddress rate limit', () => {
  const previousVercelKey = process.env.VERCEL_KEY;

  afterEach(() => {
    sinon.restore();
    process.env.VERCEL_KEY = previousVercelKey;
  });

  it('bypasses the resolver-level daily limit for trusted Vercel requests', async () => {
    process.env.VERCEL_KEY = 'trusted-vercel-key';
    const existingWalletAddress = '0x1111111111111111111111111111111111111111';
    const existingUser = {
      id: 42,
      walletAddress: existingWalletAddress,
    } as User;
    const evalStub = sinon.stub(redis, 'eval');
    const getOne = sinon.stub().resolves(existingUser);
    const where = sinon.stub().returns({ getOne });
    sinon.stub(User, 'createQueryBuilder').returns({ where } as never);
    sinon.stub(AppDataSource, 'getDataSource').returns({
      getRepository: () => ({}),
    } as never);
    const resolver = new UserResolver({} as never);

    const result = await resolver.createUserByAddress(existingWalletAddress, {
      expressReq: {
        headers: {
          vercel_key: 'trusted-vercel-key',
        },
        ip: '10.0.0.1',
      },
    } as never);

    assert.isTrue(result.existing);
    assert.equal(result.user.id, existingUser.id);
    assert.isFalse(evalStub.called);
  });

  it('keeps rejecting untrusted public traffic above the daily limit', async () => {
    process.env.VERCEL_KEY = 'trusted-vercel-key';
    sinon.stub(redis, 'eval').resolves(21);
    sinon.stub(AppDataSource, 'getDataSource').returns({
      getRepository: () => ({}),
    } as never);
    const resolver = new UserResolver({} as never);

    await assertRejects(
      () =>
        resolver.createUserByAddress(
          '0x2222222222222222222222222222222222222222',
          {
            expressReq: {
              headers: {},
              ip: '198.51.100.10',
            },
          } as never,
        ),
      /Rate limit exceeded \(20 per day\)/,
    );
  });
});
