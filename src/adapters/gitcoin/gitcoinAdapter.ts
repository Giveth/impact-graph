import axios from 'axios';
import {
  GitcoinAdapterInterface,
  SigningMessageAndNonceResponse,
  SubmitPassportInput,
  SubmittedPassportResponse,
  SubmittedPassportsResponse,
  GetPassportStampsResponse,
} from './gitcoinAdapterInterface';
import { logger } from '../../utils/logger';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';

const GITCOIN_API_BASE_URL = 'https://api.scorer.gitcoin.co';

export class GitcoinAdapter implements GitcoinAdapterInterface {
  private GitcoinApiKey;
  private ScorerID;

  constructor() {
    this.GitcoinApiKey = process.env.GITCOIN_PASSPORT_API || '';
    this.ScorerID = process.env.GITCOIN_SCORER_ID || '';
  }

  // New Model API
  /*
    address: string;
    details: {
      models: {
        ethereum_activity: {
          score: number;
        }
      }
    } 
   */
  async getUserAnalysisScore(address: string): Promise<number> {
    try {
      const result = await axios.get(
        `${GITCOIN_API_BASE_URL}/passport/analysis/${address.toLowerCase()}`,
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
          },
        },
      );
      return result.data?.details?.models?.ethereum_activity?.score;
    } catch (e) {
      logger.error('getUserAnalysisScore error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }

  async getWalletAddressScore(
    address: string,
  ): Promise<SubmittedPassportResponse> {
    try {
      const result = await axios.get(
        `${GITCOIN_API_BASE_URL}/registry/score/${
          this.ScorerID
        }/${address.toLowerCase()}`,
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
          },
        },
      );

      if (result.data.error !== null) {
        logger.error('getWalletAddressScore error', result.data.error);
        throw new Error(
          i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
        );
      }
      return result.data;
    } catch (e) {
      logger.error('getWalletAddressScore error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }

  async getListOfScores(): Promise<SubmittedPassportsResponse> {
    try {
      const result = await axios.get(
        `${GITCOIN_API_BASE_URL}/registry/score/${this.ScorerID}`,
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
          },
        },
      );
      return result.data;
    } catch (e) {
      logger.error('getListOfScores error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }

  async getSigningMessageAndNonce(): Promise<SigningMessageAndNonceResponse> {
    try {
      const result = await axios.get(
        `${GITCOIN_API_BASE_URL}/registry/signing-message`,
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
          },
        },
      );
      return result.data;
    } catch (e) {
      logger.error('getSigningMessageAndNonce error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }

  async submitPassport(
    params: SubmitPassportInput,
  ): Promise<SubmittedPassportResponse> {
    try {
      const result = await axios.post(
        `${GITCOIN_API_BASE_URL}/registry/submit-passport`,
        {
          address: params.address.toLowerCase(),
          scorer_id: this.ScorerID,
        },
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      if (result.data.error !== null) {
        logger.error('submitPassport error', result.data.error);
        throw new Error(
          i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
        );
      }
      return result.data;
    } catch (e) {
      logger.error('submitPassport error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }

  async getPassportStamps(address: string): Promise<GetPassportStampsResponse> {
    try {
      const result = await axios.get(
        `${GITCOIN_API_BASE_URL}/registry/stamps/${address.toLowerCase()}`,
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
          },
        },
      );
      logger.debug('getPassportStamps() has successfully returned data', {
        walletAddress: address,
      });
      return result.data;
    } catch (e) {
      logger.error('getPassportStamps error', e);
      throw new Error(
        i18n.__(translationErrorMessagesKeys.GITCOIN_ERROR_FETCHING_DATA),
      );
    }
  }
}
