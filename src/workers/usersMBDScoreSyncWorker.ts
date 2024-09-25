// workers/auth.js
import { expose } from 'threads/worker';
import { WorkerModule } from 'threads/dist/types/worker';
import { getGitcoinAdapter } from '../adapters/adaptersFactory';

type UsersMBDScoreSyncWorkerFunctions = 'syncUserScore';

export type UserMDBScoreSyncWorker =
  WorkerModule<UsersMBDScoreSyncWorkerFunctions>;

const worker: UserMDBScoreSyncWorker = {
  async syncUserScore(args: { userWallet: string }) {
    return await getGitcoinAdapter().getUserAnalysisScore(args.userWallet);
  },
};

expose(worker);
