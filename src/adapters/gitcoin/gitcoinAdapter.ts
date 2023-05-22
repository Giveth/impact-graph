import axios from 'axios';
import {
  GitcoinAdapterInterface,
  SigningMessageAndNonceResponse,
  SubmitPassportInput,
  SubmittedPassportResponse,
  SubmittedPassportsResponse,
  GetPassportStampsResponse,
} from './gitcoinAdapterInterface';

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
    const result = await axios.get(
      `${GITCOIN_API_BASE_URL}/registry/score/${this.ScorerID}/${address}`,
      {
        headers: {
          'X-API-KEY': this.GitcoinApiKey,
        },
      },
    );
    return result.data;
  }

  async getListOfScores(): Promise<SubmittedPassportsResponse> {
    const result = await axios.get(
      `${GITCOIN_API_BASE_URL}/registry/score/${this.ScorerID}`,
      {
        headers: {
          'X-API-KEY': this.GitcoinApiKey,
        },
      },
    );
    return result.data;
  }

  async getSigningMessageAndNonce(): Promise<SigningMessageAndNonceResponse> {
    const result = await axios.get(
      `${GITCOIN_API_BASE_URL}/registry/signing-message`,
      {
        headers: {
          'X-API-KEY': this.GitcoinApiKey,
        },
      },
    );
    return result.data;
  }

  async submitPassport(
    params: SubmitPassportInput,
  ): Promise<SubmittedPassportResponse> {
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
  }

  async getPassportStamps(address: string): Promise<GetPassportStampsResponse> {
    const result = await axios.get(
      `${GITCOIN_API_BASE_URL}/registry/stamps/${address}`,
      {
        headers: {
          'X-API-KEY': this.GitcoinApiKey,
        },
      },
    );
    return result.data;
  }
}
