import { assert } from 'chai';
import sinon from 'sinon';
import { Request, Response } from 'express';
import { createDownloadAdminJsExportHandler } from './adminJsExportDownload';

describe(
  'createDownloadAdminJsExportHandler() test cases',
  downloadAdminJsExportTestCases,
);

function downloadAdminJsExportTestCases() {
  const buildReq = (filename: string): Request =>
    ({ params: { filename }, headers: {} }) as unknown as Request;

  const buildRes = () => {
    const res: any = {};
    res.statusCode = undefined;
    res.status = sinon.stub().callsFake((code: number) => {
      res.statusCode = code;
      return res;
    });
    res.send = sinon.stub().returnsThis();
    res.download = sinon.stub();
    return res as Response & {
      status: sinon.SinonStub;
      send: sinon.SinonStub;
      download: sinon.SinonStub;
    };
  };

  it('responds 401 and serves no file when there is no admin session', async () => {
    const handler = createDownloadAdminJsExportHandler(
      sinon.stub().resolves(false),
    );
    const res = buildRes();

    await handler(buildReq('emails.csv'), res);

    assert.isTrue(res.status.calledOnceWith(401));
    assert.isTrue(res.send.calledOnceWith('Unauthorized'));
    assert.isFalse(res.download.called);
  });

  it('responds 401 when resolving the session throws (e.g. no cookie header)', async () => {
    // getCurrentAdminJsSession throws TypeError when there is no cookie header.
    const handler = createDownloadAdminJsExportHandler(
      sinon.stub().rejects(new TypeError('argument str must be a string')),
    );
    const res = buildRes();

    await handler(buildReq('emails.csv'), res);

    assert.isTrue(res.status.calledOnceWith(401));
    assert.isFalse(res.download.called);
  });

  it('serves the requested export from the exports dir for a valid admin session', async () => {
    const handler = createDownloadAdminJsExportHandler(
      sinon.stub().resolves({ id: 1 }),
    );
    const res = buildRes();

    await handler(buildReq('emails.csv'), res);

    assert.isFalse(res.status.calledWith(401));
    assert.isTrue(res.download.calledOnce);
    const servedPath = res.download.firstCall.args[0] as string;
    assert.match(servedPath, /adminJs\/tabs\/exports\/emails\.csv$/);
  });
}
