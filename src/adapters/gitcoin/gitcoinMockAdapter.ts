import {
  GitcoinAdapterInterface,
  SigningMessageAndNonceResponse,
  SubmitPassportInput,
  SubmittedPassportResponse,
  SubmittedPassportsResponse,
  GetPassportStampsResponse,
} from './gitcoinAdapterInterface';

export class GitcoinMockAdapter implements GitcoinAdapterInterface {
  async getWalletAddressScore(
    address: string,
  ): Promise<SubmittedPassportResponse> {
    return Promise.resolve({
      address: 'string',
      score: 'string',
      status: 'string',
      last_score_timestamp: 'string',
      evidence: undefined,
      error: undefined,
    });
  }
  async getListOfScores(): Promise<SubmittedPassportsResponse> {
    return Promise.resolve({
      items: [
        {
          address: 'string',
          score: 'string',
          status: 'string',
          last_score_timestamp: 'string',
          evidence: undefined,
          error: undefined,
        },
      ],
      count: 1,
    });
  }
  async getSigningMessageAndNonce(): Promise<SigningMessageAndNonceResponse> {
    return Promise.resolve({
      message: 'string',
      nonce: 'string',
    });
  }
  async submitPassport(
    params: SubmitPassportInput,
  ): Promise<SubmittedPassportResponse> {
    return Promise.resolve({
      address: 'string',
      score: 'string',
      status: 'string',
      last_score_timestamp: 'string',
      evidence: undefined,
      error: undefined,
    });
  }
  async getPassportStamps(address: string): Promise<GetPassportStampsResponse> {
    return Promise.resolve({
      next: 'string',
      prev: 'string',
      items: [
        {
          version: 'string',
          credential: 'any',
        },
      ],
    });
  }
}
