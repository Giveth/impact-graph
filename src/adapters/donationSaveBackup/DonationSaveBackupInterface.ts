export type FetchedSavedFailDonationInterface = {
  _id: string;
  txHash: string;
  imported: boolean;
  token: {
    symbol: string;
    address: string;
    networkId: number;
  };
  walletAddress: string;
  amount: number;
  chainId: number;
  projectId: number;
  anonymous: boolean;
  nonce: number;
  symbol: string;
  chainvineReferred?: string;
  safeTransactionId?: string;
};

export interface DonationSaveBackupInterface {
  getNotImportedDonationsFromBackup(params: {
    limit: number;
    skip: number;
  }): Promise<FetchedSavedFailDonationInterface[]>;

  getSingleDonationFromBackupByTxHash(
    txHash: string,
  ): Promise<FetchedSavedFailDonationInterface | null>;

  markDonationAsImported(donationMongoId: string): Promise<void>;

  unmarkDonationAsImported(donationMongoId: string): Promise<void>;

  getSingleDonationFromBackupById(
    donationMongoId: string,
  ): Promise<FetchedSavedFailDonationInterface | null>;
}
