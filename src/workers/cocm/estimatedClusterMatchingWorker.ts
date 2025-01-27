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
    logger.debug('fetchEstimatedClusterMatching() has been called');
    try {
      const matchingData =
        await getClusterMatchingAdapter().fetchEstimatedClusterMatchings(
          matchingDataInput,
        );
      logger.debug(
        'fetchEstimatedClusterMatching() has worked with params',
        String(matchingData),
      );
      return matchingData;
    } catch (e) {
      logger.error('fetchEstimatedClusterMatching() did not work. Error: ', e);
      return;
    }
  },

  async updateEstimatedClusterMatching(qfRoundId: number, matchingData: any) {
    logger.debug('updateEstimatedClusterMatching() has been called');
    try {
      const params: any[] = [];
      const values = matchingData
        .map((data, index) => {
          const baseIndex = index * 3;
          params.push(data.project_name, qfRoundId, data.matching_amount);
          return `(
            (SELECT id FROM project WHERE title = $${baseIndex + 1}),
            $${baseIndex + 2},
            $${baseIndex + 3}
          )`;
        })
        .join(',');

      const query = `
        INSERT INTO "estimated_cluster_matching" ("projectId", "qfRoundId", matching)
        VALUES ${values}
        ON CONFLICT ("projectId", "qfRoundId")
        DO UPDATE SET matching = EXCLUDED.matching
        RETURNING "projectId", "qfRoundId", matching;
      `;

      const result = await EstimatedClusterMatching.query(query, params);
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
