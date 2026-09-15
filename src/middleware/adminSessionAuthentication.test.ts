import { assert } from 'chai';
import sinon from 'sinon';
import { Request, Response, NextFunction } from 'express';
import * as adminJsModule from '../server/adminJs/adminJs';
import { User, UserRole } from '../entities/user';
import { adminSessionAuthentication } from './adminSessionAuthentication';

const run = async (sessionUser: User | false) => {
  const getCurrentAdminJsSession = sinon
    .stub(adminJsModule, 'getCurrentAdminJsSession')
    .resolves(sessionUser);
  const status = sinon.stub();
  const send = sinon.stub();
  status.returns({ send });
  const res = { status, send } as unknown as Response;
  const next = sinon.stub() as sinon.SinonStub & NextFunction;
  try {
    await adminSessionAuthentication({} as Request, res, next as NextFunction);
  } finally {
    getCurrentAdminJsSession.restore();
  }
  return { status, send, next };
};

const adminWithRole = (role: UserRole) => ({ role }) as User;

describe('adminSessionAuthentication', () => {
  it('rejects anonymous callers (no valid session) with 401', async () => {
    const { status, send, next } = await run(false);
    assert.isTrue(status.calledOnceWith(401));
    assert.isTrue(send.calledOnce);
    assert.isFalse(next.called);
  });

  it('rejects users whose role was downgraded to restricted', async () => {
    const { status, next } = await run(adminWithRole(UserRole.RESTRICTED));
    assert.isTrue(status.calledOnceWith(401));
    assert.isFalse(next.called);
  });

  it('accepts a signed-in admin and calls next', async () => {
    const { status, next } = await run(adminWithRole(UserRole.ADMIN));
    assert.isFalse(status.called);
    assert.isTrue(next.calledOnce);
  });

  it('rejects operators with 401', async () => {
    const { status, send, next } = await run(adminWithRole(UserRole.OPERATOR));
    assert.isTrue(status.calledOnceWith(401));
    assert.isTrue(send.calledOnceWith({ error: 'Unauthorized' }));
    assert.isFalse(next.called);
  });
});
