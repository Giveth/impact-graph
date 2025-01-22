import axios from 'axios';
import {
  CocmAdapterInterface,
  EstimatedMatchingInput,
  ProjectsEstimatedMatchings,
} from './cocmAdapterInterface';
import { logger } from '../../utils/logger';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';

export class CocmAdapter implements CocmAdapterInterface {
  private ClusterMatchingURL;

  constructor() {
    this.ClusterMatchingURL =
      process.env.CLUSTER_MATCHING_API_URL || 'localhost';
  }

  async fetchEstimatedClusterMatchings(
    matchingDataInput: EstimatedMatchingInput,
  ): Promise<ProjectsEstimatedMatchings> {
    try {
      const result = await axios.post(
        this.ClusterMatchingURL,
        matchingDataInput,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      if (result?.data?.error !== null) {
        logger.error('clusterMatchingApi error', result.data.error);
        throw new Error(
          i18n.__(translationErrorMessagesKeys.CLUSTER_MATCHING_API_ERROR),
        );
      }
      return result.data.matching_data;
    } catch (e) {
      logger.error('clusterMatchingApi error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.CLUSTER_MATCHING_API_ERROR),
      );
    }
  }
}
