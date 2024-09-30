// workers/auth.js
import { expose } from 'threads/worker';
import { WorkerModule } from 'threads/dist/types/worker';
import { getGitcoinAdapter } from '../adapters/adaptersFactory';

type UsersMBDScoreSyncWorkerFunctions = 'syncUserScore';

export type UserMBDScoreSyncWorker =
  WorkerModule<UsersMBDScoreSyncWorkerFunctions>;

const worker: UserMBDScoreSyncWorker = {
  async syncUserScore(args: { userWallet: string }) {
    return await getGitcoinAdapter().getUserAnalysisScore(args.userWallet);
  },
};

expose(worker);
