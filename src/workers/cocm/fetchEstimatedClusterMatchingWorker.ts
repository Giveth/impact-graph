// workers/auth.js
import { expose } from 'threads/worker';
import { WorkerModule } from 'threads/dist/types/worker';
import { getClusterMatchingAdapter } from '../../adapters/adaptersFactory';

type FetchEstimatedClusterMatchingWorkerFunctions = 'fetchEstimatedClusterMatching';

export type FetchEstimatedClusterMatchingWorker =
  WorkerModule<FetchEstimatedClusterMatchingWorkerFunctions>;

const worker: FetchEstimatedClusterMatchingWorker = {
  async fetchEstimatedClusterMatching(matchingDataInput: any) {
    return await getClusterMatchingAdapter().fetchEstimatedClusterMatchings(matchingDataInput);
  },
};

expose(worker);
