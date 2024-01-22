import config from '../../config';

import { logger } from '../../utils/logger';
import { schedule } from 'node-cron';
import { detectAddressChainType } from '../../utils/networks';
import {
  createDonationQueryValidator,
  validateWithJoiSchema,
} from '../../utils/validators/graphqlQueryValidators';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { findProjectById } from '../../repositories/projectRepository';
import { ProjStatus, Project } from '../../entities/project';
import { Token } from '../../entities/token';
import {
  isTokenAcceptableForProject,
  updateDonationPricesAndValues,
} from '../donationService';
import { findProjectRecipientAddressByNetworkId } from '../../repositories/projectAddressRepository';
import {
  findUserByWalletAddress,
  setUserAsReferrer,
} from '../../repositories/userRepository';
import { ChainType } from '../../types/network';
import { Donation } from '../../entities/donation';
import { getChainvineReferralInfoForDonation } from '../chainvineReferralService';
import { relatedActiveQfRoundForProject } from '../qfRoundService';
import { NETWORK_IDS } from '../../provider';
import { FetchedSavedFailDonationInterface } from '../../adapters/donationSaveBackup/DonationSaveBackupInterface';
import { getDonationSaveBackupAdapter } from '../../adapters/adaptersFactory';
import { DonationResolver } from '../../resolvers/donationResolver';
import { ApolloContext } from '../../types/ApolloContext';

const cronJobTime =
  (config.get('DONATION_SAVE_BACKUP_CRONJOB_EXPRESSION') as string) ||
  '0 0 * * 0';

export const runSyncBackupServiceDonations = () => {
  logger.debug('importBackupServiceDonations() has been called');
  schedule(cronJobTime, async () => {
    await importBackupServiceDonations();
  });
};

// Minimum required params from the backup mongodb
interface BackupDonationData {
  _id: string;
  chainId: number;
  txHash: string;
  amount: number;
  token: {
    address: number;
  };
  projectId: number;
  anonymous: false;
  nonce: string;
  walletAddress: string;
  symbol: string;
  chainvineReferred: string;
  safeTransactionId?: string;
}

// Mock Mongo Methods to write a test
export const importBackupServiceDonations = async () => {
  const limit = 10;
  let skip = 0;
  let donations =
    await getDonationSaveBackupAdapter().getNotImportedDonationsFromBackup({
      limit,
      skip,
    });
  while (donations.length > 0) {
    for (const donation of donations) {
      try {
        await createBackupDonation(donation);
        await getDonationSaveBackupAdapter().markDonationAsImported(
          donation._id,
        );
      } catch (e) {
        logger.error(`donation error with id ${donation._id}: `, e);
        logger.error('donation error with params: ', donation);
      }
    }
    skip += limit;
    donations =
      await getDonationSaveBackupAdapter().getNotImportedDonationsFromBackup({
        limit,
        skip,
      });
  }
};

// Same logic as the donationResolver CreateDonation() mutation
const createBackupDonation = async (
  donationData: FetchedSavedFailDonationInterface,
) => {
  const {
    amount,
    txHash,
    chainId,
    token,
    anonymous,
    walletAddress,
    projectId,
    nonce,
    safeTransactionId,
    chainvineReferred,
  } = donationData;

  if (!token?.address) return; // test donations

  const donorUser = await findUserByWalletAddress(walletAddress);
  if (!donorUser) {
    throw new Error(i18n.__(translationErrorMessagesKeys.UN_AUTHORIZED));
  }

  const donationResolver = new DonationResolver();
  donationResolver.createDonation(
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
};
