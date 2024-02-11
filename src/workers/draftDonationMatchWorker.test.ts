import { ModuleThread, Pool, spawn, Worker } from 'threads';
import { DraftDonationWorker } from './draftDonationMatchWorker';

describe('draftDonationMatchWorker', () => {
  let worker: Pool<ModuleThread<DraftDonationWorker>>;
  beforeEach(() => {
    worker = Pool(() => spawn(new Worker('./draftDonationMatchWorker')), {
      name: '__draftDonationMatchWorkerTest',
      concurrency: 2,
      size: 2,
    });
  });
  it('should match draft donations', async () => {
    await Promise.all([
      worker.queue(draftDonationWorker =>
        draftDonationWorker.matchDraftDonations(),
      ),
      //   worker.queue(draftDonationWorker =>
      //     draftDonationWorker.matchDraftDonations(),
      // ),
    ]);
  });
});
