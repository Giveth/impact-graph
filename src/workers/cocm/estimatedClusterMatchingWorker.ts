// workers/auth.js
import { expose } from 'threads/worker';
import { WorkerModule } from 'threads/dist/types/worker';
import { getClusterMatchingAdapter } from '../../adapters/adaptersFactory';
import { EstimatedClusterMatching } from '../../entities/estimatedClusterMatching';
import { logger } from '../../utils/logger';

type EstimatedClusterMatchingWorkerFunctions =
  | 'fetchEstimatedClusterMatching'
  | 'updateEstimatedClusterMatching';

export type EstimatedClusterMatchingWorker =
  WorkerModule<EstimatedClusterMatchingWorkerFunctions>;

const worker: EstimatedClusterMatchingWorker = {
  async fetchEstimatedClusterMatching(matchingDataInput: any) {
    return await getClusterMatchingAdapter().fetchEstimatedClusterMatchings(
      matchingDataInput,
    );
  },

  async updateEstimatedClusterMatching(qfRoundId: number, matchingData: any) {
    try {
      // Prepare values for bulk insert
      const values = matchingData
        .map(
          data => `(
        (SELECT id FROM project WHERE title = '${data.project_name}'), 
        ${qfRoundId}, 
        ${data.matching_amount}
      )`,
        )
        .join(',');

      const query = `
        INSERT INTO estimated_cluster_matching ("projectId", "qfRoundId", matching)
        VALUES ${values}
        ON CONFLICT ("projectId", "qfRoundId")
        DO UPDATE SET matching = EXCLUDED.matching
        RETURNING "projectId", "qfRoundId", matching;
      `;

      const result = await EstimatedClusterMatching.query(query);
      if (result.length === 0) {
        throw new Error('No records were inserted or updated.');
      }

      logger.debug('Matching data processed successfully with raw SQL.');
    } catch (error) {
      logger.debug('Error processing matching data:', error.message);
    }
  },
};

expose(worker);
