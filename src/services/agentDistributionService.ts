import axios from 'axios';
import { logger } from '../utils/logger';

interface WalletGenerationResponse {
  address: string;
  hdPath: string;
}

export class AgentDistributionService {
  private static readonly AGENT_DISTRIBUTION_SERVICE_API_URL =
    process.env.AGENT_DISTRIBUTION_SERVICE_API_URL;

  static async generateWallet(): Promise<WalletGenerationResponse> {
    try {
      if (!this.AGENT_DISTRIBUTION_SERVICE_API_URL) {
        throw new Error('AGENT_DISTRIBUTION_SERVICE_API_URL is not set');
      }

      const generateAddressUrl = `${this.AGENT_DISTRIBUTION_SERVICE_API_URL}/api/wallet/generate`;
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
        hdPath: response.data.hdPath,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to generate wallet', { error });
      throw new Error('Failed to generate funding pool address');
    }
  }
}
