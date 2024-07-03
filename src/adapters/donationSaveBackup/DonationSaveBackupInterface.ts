export type FetchedSavedFailDonationInterface = {
  _id: string;
  txHash: string;
  imported?: boolean;
  importError?: string;
  token: {
    symbol: string;
    address: string;
    networkId: number;
  };
  walletAddress: string;
  amount: number;
  chainId?: number;
  projectId: number;
  anonymous: boolean;
  nonce: number;
  symbol: string;
  chainvineReferred?: string;
  safeTransactionId?: string;
  useDonationBox?: boolean;
};

export interface DonationSaveBackupInterface {
  getNotImportedDonationsFromBackup(params: {
    limit: number;
  }): Promise<FetchedSavedFailDonationInterface[]>;

  getSingleDonationFromBackupByTxHash(
    txHash: string,
  ): Promise<FetchedSavedFailDonationInterface | null>;

  markDonationAsImported(donationMongoId: string): Promise<void>;

  unmarkDonationAsImported(donationMongoId: string): Promise<void>;

  getSingleDonationFromBackupById(
    donationMongoId: string,
  ): Promise<FetchedSavedFailDonationInterface | null>;

  markDonationAsImportError(
    donationMongoId: string,
    errorMessage,
  ): Promise<void>;
}
