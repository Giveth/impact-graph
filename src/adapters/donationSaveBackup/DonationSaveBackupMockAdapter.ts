import {
  DonationSaveBackupInterface,
  FetchedSavedFailDonationInterface,
} from './DonationSaveBackupInterface';

export class DonationSaveBackupMockAdapter
  implements DonationSaveBackupInterface
{
  async getNotImportedDonationsFromBackup(params: {
    limit: number;
    skip: number;
  }): Promise<FetchedSavedFailDonationInterface[]> {
    return [];
  }

  async getSingleDonationFromBackupByTxHash(
    txHash: string,
  ): Promise<FetchedSavedFailDonationInterface | null> {
    return null;
  }

  async markDonationAsImported(donationMongoId: string): Promise<void> {
    //
  }

  async unmarkDonationAsImported(donationMongoId: string): Promise<void> {
    //
  }

  async getSingleDonationFromBackupById(
    donationMongoId: string,
  ): Promise<FetchedSavedFailDonationInterface | null> {
    return null;
  }
}
