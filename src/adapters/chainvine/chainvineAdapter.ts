import { ChainvineClient } from '@chainvine/sdk/lib';
import { Response } from 'express';
import {
  ChainvineAdapterInterface,
  LinkDonorToChainvineReferrerType,
  NotifyChainVineInputType,
} from './chainvineAdapterInterface.js';
import { errorMessages } from '../../utils/errorMessages.js';
import { logger } from '../../utils/logger.js';

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
  async getWalletAddressFromReferrer(referrerId: string): Promise<string> {
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

  async registerClickEvent(referrerId: string): Promise<void> {
    try {
      await this.ChainvineSDK.recordClick(referrerId);
    } catch (e) {
      logger.error('registerClickEvent() error ', { error: e });
      throw e;
    }
  }

  async linkDonorToReferrer(
    params: LinkDonorToChainvineReferrerType,
  ): Promise<void> {
    try {
      await this.ChainvineSDK.linkReferrer({
        referrer_id: params.referrerId,
        wallet_address: params.walletAddress,
      });
    } catch (e) {
      logger.error('linkDonorToReferrer() error ', { error: e });
      throw e;
    }
  }

  async generateChainvineId(
    walletAddress: string,
  ): Promise<string | void | null> {
    try {
      const chainvineResult =
        await this.ChainvineSDK.getReferralUrl(walletAddress);
      // https://app.chainvine.xyz/giveth?referrer_id=xxxxxxxxxxxxxxxxxxxxxxxxx
      const referralUrl = new URL(chainvineResult?.url);
      const referredId = referralUrl.searchParams.get('referrer_id');
      return referredId;
    } catch (e) {
      logger.error('generateChainvineId() error ', { error: e });
      throw e;
    }
  }
}
