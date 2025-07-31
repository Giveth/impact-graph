import axios from 'axios';
import { logger } from '../utils/logger';

interface WalletGenerationResponse {
  address: string;
  hdPath: string;
}

export interface DistributionServicePayload {
  walletAddress: string;
  causeId: number;
  projects: Array<{
    projectId: number;
    name: string;
    slug: string;
    walletAddress: string;
    score: number;
  }>;
  causeOwnerAddress: string;
}

export class AgentDistributionService {
  private static readonly AGENT_DISTRIBUTION_SERVICE_API_URL =
    process.env.AGENT_DISTRIBUTION_SERVICE_API_URL;

  static async generateWallet(): Promise<WalletGenerationResponse> {
    try {
      if (!AgentDistributionService.AGENT_DISTRIBUTION_SERVICE_API_URL) {
        throw new Error('AGENT_DISTRIBUTION_SERVICE_API_URL is not set');
      }

      const generateAddressUrl = `${AgentDistributionService.AGENT_DISTRIBUTION_SERVICE_API_URL}/api/wallet/generate`;
      logger.debug('Generating wallet via API', { url: generateAddressUrl });

      const response = await axios.post<WalletGenerationResponse>(
        generateAddressUrl,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        },
      );

      logger.debug('Wallet generated successfully', {
        address: response.data.address,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to generate wallet', { error });
      throw new Error('Failed to generate funding pool address');
    }
  }

  static async callDistributionService(
    payload: DistributionServicePayload,
  ): Promise<boolean> {
    const distributionServiceUrl =
      AgentDistributionService.AGENT_DISTRIBUTION_SERVICE_API_URL;

    if (!distributionServiceUrl) {
      throw new Error('AGENT_DISTRIBUTION_SERVICE_API_URL is not configured');
    }

    const endpoint = `${distributionServiceUrl}/api/wallet/distribute-funds`;

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout
      });

      logger.info('Distribution service call successful', {
        status: response.status,
        data: response.data,
      });
      return true;
    } catch (error) {
      logger.error('Distribution service call failed', {
        error: error.response?.data || error.message,
        status: error.response?.status,
        payload: {
          walletAddress: payload.walletAddress,
          causeId: payload.causeId,
          projectsCount: payload.projects.length,
        },
      });
      return false;
    }
  }
}
