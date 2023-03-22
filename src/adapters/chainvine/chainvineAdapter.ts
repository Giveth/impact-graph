import {
  ChainvineAdapterInterface,
  NotifyChainVineInputType,
} from './chainvineAdapterInterface';

import { ChainvineClient } from '@chainvine/sdk/lib';
import { Response } from 'express';
import { errorMessages } from '../../utils/errorMessages';
import { logger } from '../../utils/logger';
import { titleWithoutSpecialCharacters } from '../../utils/utils';

export interface ChainvineRetrieveWalletResponse extends Response {
  wallet_address?: string;
  user_id?: string;
}

export class ChainvineAdapter implements ChainvineAdapterInterface {
  private ChainvineSDK;
  constructor() {
    // Initialize the client
    this.ChainvineSDK = new ChainvineClient({
      apiKey: process.env.CHAINVINE_API_KEY || '',
      testMode: process.env.CHAINVINE_API_ENABLE_TEST_MODE === 'true', // optional, defaults to false. When set to true, the SDK will use the test API endpoint
    });
  }
  async getWalletAddressFromReferer(referrerId: string): Promise<string> {
    const response = (await this.ChainvineSDK.getWalletAddressForUser(
      referrerId,
    )) as ChainvineRetrieveWalletResponse;
    if (!response?.wallet_address) {
      throw new Error(errorMessages.CHAINVINE_REFERRER_NOT_FOUND);
    }
    return response.wallet_address.toLowerCase();
  }

  async notifyChainVine(params: NotifyChainVineInputType): Promise<void> {
    try {
      await this.ChainvineSDK.referralConversion({
        wallet_address: params.fromWalletAddress,
        amount: params.amount,
        transaction_hash: params.transactionId, // optional
        token_address: params.tokenAddress, // optional
        usd_value: params.valueUsd, // optional, the USD value of the token at the time of the conversion
        external_identifier: String(params.donationId), // optional (e.g. a product ID in your system)
      });
    } catch (e) {
      logger.error('notifyChainVine error ', { params, error: e });
      throw e;
    }
  }

  async getReferralStartTimestamp(
    walletAddress: string,
  ): Promise<string | void> {
    try {
      const referrerStartResponse =
        await this.ChainvineSDK.getIncentiveClicksForWalletAddress(
          walletAddress,
        );

      if (referrerStartResponse.length === 0) return;
      return referrerStartResponse[0].date_created;
    } catch (e) {
      logger.error('getChainvineReferralStartTimestamp error ', { error: e });
      throw e;
    }
  }
}
