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

  async getWalletAddressScore(
    address: string,
  ): Promise<SubmittedPassportResponse> {
    try {
      const result = await axios.get(
        `${GITCOIN_API_BASE_URL}/registry/score/${this.ScorerID}/${address}`,
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
          },
        },
      );
      return result.data;
    } catch (e) {
      logger.error('getWalletAddressScore error', e);
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE,
        ),
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
        i18n.__(
          translationErrorMessagesKeys.ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE,
        ),
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
        i18n.__(
          translationErrorMessagesKeys.ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE,
        ),
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
          variables: params,
        },
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );
      return result.data;
    } catch (e) {
      logger.error('submitPassport error', e);
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE,
        ),
      );
    }
  }

  async getPassportStamps(address: string): Promise<GetPassportStampsResponse> {
    try {
      const result = await axios.get(
        `${GITCOIN_API_BASE_URL}/registry/stamps/${address}`,
        {
          headers: {
            'X-API-KEY': this.GitcoinApiKey,
          },
        },
      );
      return result.data;
    } catch (e) {
      logger.error('getPassportStamps error', e);
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.ERROR_IN_GETTING_ACCESS_TOKEN_BY_AUTHORIZATION_CODE,
        ),
      );
    }
  }
}
