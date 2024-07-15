export interface SigningMessageAndNonceResponse {
  message: string;
  nonce: string;
}

export interface SubmitPassportInput {
  address: string;
}

export interface SubmittedPassportResponse {
  address: string;
  score: string | undefined | null;
  status: string;
  last_score_timestamp: string;
  evidence: any | undefined | null;
  error: string | undefined | null;
}

export interface SubmittedPassportsResponse {
  items: SubmittedPassportResponse[];
  count: number;
}

interface StampInterface {
  version: string;
  credential: any;
}

export interface GetPassportStampsResponse {
  next: string | null | undefined;
  prev: string | null | undefined;
  items: StampInterface[];
}

export interface GitcoinAdapterInterface {
  getWalletAddressScore(address: string): Promise<SubmittedPassportResponse>;
  getListOfScores(): Promise<SubmittedPassportsResponse>;
  getSigningMessageAndNonce(): Promise<SigningMessageAndNonceResponse>;
  submitPassport(
    params: SubmitPassportInput,
  ): Promise<SubmittedPassportResponse>;
  getPassportStamps(address: string): Promise<GetPassportStampsResponse>;
}
