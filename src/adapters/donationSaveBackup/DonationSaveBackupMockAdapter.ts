import {
  DonationSaveBackupInterface,
  FetchedSavedFailDonationInterface,
} from './DonationSaveBackupInterface';

export class DonationSaveBackupMockAdapter
  implements DonationSaveBackupInterface
{
  async getNotImportedDonationsFromBackup(): Promise<
    FetchedSavedFailDonationInterface[]
  > {
    return [];
  }

  async getSingleDonationFromBackupByTxHash(): Promise<FetchedSavedFailDonationInterface | null> {
    return null;
  }

  async markDonationAsImported(): Promise<void> {
    //
  }

  async unmarkDonationAsImported(): Promise<void> {
    //
  }

  async getSingleDonationFromBackupById(): Promise<FetchedSavedFailDonationInterface | null> {
    return null;
  }

  markDonationAsImportError(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
