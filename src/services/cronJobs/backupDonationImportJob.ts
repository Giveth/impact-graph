import { schedule } from 'node-cron';
import config from '../../config';

import { logger } from '../../utils/logger';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { findUserByWalletAddress } from '../../repositories/userRepository';
import { Donation } from '../../entities/donation';
import { FetchedSavedFailDonationInterface } from '../../adapters/donationSaveBackup/DonationSaveBackupInterface';
import { getDonationSaveBackupAdapter } from '../../adapters/adaptersFactory';
import { DonationResolver } from '../../resolvers/donationResolver';
import { ApolloContext } from '../../types/ApolloContext';
import { findDonationById } from '../../repositories/donationRepository';
import { getCreatedAtFromMongoObjectId } from '../../utils/utils';

const cronJobTime =
  (config.get('DONATION_SAVE_BACKUP_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * 0';

export const runSyncBackupServiceDonations = () => {
  logger.debug('runSyncBackupServiceDonations() has been called');
  schedule(cronJobTime, async () => {
    await importBackupServiceDonations();
  });
};

// Mock Mongo Methods to write a test
export const importBackupServiceDonations = async () => {
  logger.debug('importBackupServiceDonations() has been called');
  const limit = 10;
  let donations =
    await getDonationSaveBackupAdapter().getNotImportedDonationsFromBackup({
      limit,
    });
  logger.debug(
    'importBackupServiceDonations() donations.length:',
    donations.length,
  );
  while (donations.length > 0) {
    for (const donation of donations) {
      try {
        await createBackupDonation(donation);
        await getDonationSaveBackupAdapter().markDonationAsImported(
          donation._id,
        );
        logger.debug('Failed donation has imported successfully', {
          donationId: donation._id,
          txHash: donation.txHash,
          networkId: donation.chainId,
        });
      } catch (e) {
        await getDonationSaveBackupAdapter().markDonationAsImportError(
          donation._id,
          e.message,
        );
        logger.error(
          `Import failed donation error with id ${donation._id}: `,
          e,
        );
        logger.error('Import failed  donation error with params: ', donation);
      }
    }
    donations =
      await getDonationSaveBackupAdapter().getNotImportedDonationsFromBackup({
        limit,
      });
    logger.debug('importBackupServiceDonations() inside loop ', {
      donationsLength: donations.length,
      limit,
    });
  }
};

// Same logic as the donationResolver CreateDonation() mutation
export const createBackupDonation = async (
  donationData: FetchedSavedFailDonationInterface,
): Promise<Donation> => {
  const {
    amount,
    txHash,
    token,
    anonymous,
    walletAddress,
    projectId,
    nonce,
    safeTransactionId,
    chainvineReferred,
  } = donationData;

  const chainId = donationData?.chainId || donationData.token.networkId;

  const donorUser = await findUserByWalletAddress(walletAddress);
  if (!donorUser) {
    throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
  }

  const donationResolver = new DonationResolver();
  const donationId = await donationResolver.createDonation(
    amount,
    txHash,
    chainId,
    token.address,
    anonymous,
    token.symbol,
    projectId,
    nonce,
    '',
    {
      req: { user: { userId: donorUser.id }, auth: {} },
    } as ApolloContext,
    chainvineReferred,
    safeTransactionId,
  );
  const donation = (await findDonationById(Number(donationId))) as Donation;
  donation!.createdAt = getCreatedAtFromMongoObjectId(donationData._id);
  donation!.importDate = new Date();

  return donation.save();
};
