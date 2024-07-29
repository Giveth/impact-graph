import {
  GitcoinAdapterInterface,
  SigningMessageAndNonceResponse,
  SubmitPassportInput,
  SubmittedPassportResponse,
  SubmittedPassportsResponse,
  GetPassportStampsResponse,
} from './gitcoinAdapterInterface.js';

export const cachedReferralAddresses = {};

export class GitcoinMockAdapter implements GitcoinAdapterInterface {
  async getUserAnalysisScore(_address: string): Promise<number> {
    return 1;
  }

  async getWalletAddressScore(
    address: string,
  ): Promise<SubmittedPassportResponse> {
    if (cachedReferralAddresses[address]) {
      return Promise.resolve({
        address,
        score: '10.5',
        status: 'ok',
        last_score_timestamp: 'string',
        evidence: undefined,
        error: undefined,
      });
    }
    return Promise.resolve({
      address,
      score: undefined,
      status: 'Error',
      last_score_timestamp: 'string',
      evidence: undefined,
      error: 'Invalid address',
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
  // Use this method to register in the cache the address for testing
  async submitPassport(
    params: SubmitPassportInput,
  ): Promise<SubmittedPassportResponse> {
    if (!cachedReferralAddresses[params.address]) {
      cachedReferralAddresses[params.address] = params.address;
    }
    return Promise.resolve({
      address: 'string',
      score: '10',
      status: 'string',
      last_score_timestamp: 'string',
      evidence: undefined,
      error: undefined,
    });
  }
  async getPassportStamps(address: string): Promise<GetPassportStampsResponse> {
    if (cachedReferralAddresses[address]) {
      return Promise.resolve({
        next: 'string',
        prev: 'string',
        items: [
          {
            version: '1',
            credential: 'any',
          },
          {
            version: '1',
            credential: 'any',
          },
        ],
      });
    }
    return Promise.resolve({
      next: null,
      prev: null,
      items: [],
    });
  }
}
