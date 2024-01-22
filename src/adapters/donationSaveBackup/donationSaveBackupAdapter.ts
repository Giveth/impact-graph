// a method the get objects from mongodb api read from config DONATION_SAVE_BACKUP_API_URL with sercret read from DONATION_SAVE_BACKUP_API_SECRET,
// it must filter objects by those doesn't have `imported` field with true value
// also must support pagination

import { logger } from '../../utils/logger';
import config from '../../config';
import axios from 'axios';
import {
  DonationSaveBackupInterface,
  FetchedSavedFailDonationInterface,
} from './DonationSaveBackupInterface';

const DONATION_SAVE_BACKUP_API_URL = config.get(
  'DONATION_SAVE_BACKUP_API_URL',
) as string;
const DONATION_SAVE_BACKUP_API_SECRET = config.get(
  'DONATION_SAVE_BACKUP_API_SECRET',
) as string;
const DONATION_SAVE_BACKUP_DATA_SOURCE = config.get(
  'DONATION_SAVE_BACKUP_DATA_SOURCE',
) as string;
const DONATION_SAVE_BACKUP_COLLECTION =
  config.get('DONATION_SAVE_BACKUP_COLLECTION') || 'failed_donation';
const DONATION_SAVE_BACKUP_DATABASE =
  config.get('DONATION_SAVE_BACKUP_DATABASE') || 'failed_donation';

// add '/' if doesn't exist at the
const baseUrl = DONATION_SAVE_BACKUP_API_URL.endsWith('/')
  ? DONATION_SAVE_BACKUP_API_URL
  : `${DONATION_SAVE_BACKUP_API_URL}/`;

export class DonationSaveBackupAdapter implements DonationSaveBackupInterface {
  async getNotImportedDonationsFromBackup(params: {
    limit: number;
    skip: number;
  }): Promise<FetchedSavedFailDonationInterface[]> {
    const result = await axios.post(
      `${baseUrl}find`,
      {
        collection: DONATION_SAVE_BACKUP_COLLECTION,
        database: DONATION_SAVE_BACKUP_DATABASE,
        dataSource: DONATION_SAVE_BACKUP_DATA_SOURCE,
        limit: params.limit || 10,
        skip: params.skip || 0,
        filter: {
          imported: { $ne: true },
        },
        sort: { _id: 1 },
      },
      {
        headers: {
          'api-key': DONATION_SAVE_BACKUP_API_SECRET,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
        },
      },
    );

    if (result.status !== 200) {
      logger.error('getDonationsFromBackup error', result.data);
      throw new Error('getDonationsFromBackup error');
    }
    return result.data.documents;
  }

  async getSingleDonationFromBackupByTxHash(
    txHash: string,
  ): Promise<FetchedSavedFailDonationInterface | null> {
    const result = await axios.post(
      `${baseUrl}findOne`,
      {
        collection: DONATION_SAVE_BACKUP_COLLECTION,
        database: DONATION_SAVE_BACKUP_DATABASE,
        dataSource: DONATION_SAVE_BACKUP_DATA_SOURCE,
        filter: {
          txHash,
        },
      },
      {
        headers: {
          'api-key': DONATION_SAVE_BACKUP_API_SECRET,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
        },
      },
    );

    if (result.status !== 200) {
      logger.error('getDonationsFromBackup error', result.data);
      throw new Error('getDonationsFromBackup error');
    }
    return result.data.document;
  }

  async markDonationAsImported(donationMongoId: string): Promise<void> {
    const result = await axios.post(
      `${baseUrl}updateOne`,
      {
        collection: DONATION_SAVE_BACKUP_COLLECTION,
        database: DONATION_SAVE_BACKUP_DATABASE,
        dataSource: DONATION_SAVE_BACKUP_DATA_SOURCE,
        filter: {
          _id: { $oid: donationMongoId },
        },
        update: {
          $set: {
            imported: true,
          },
        },
      },
      {
        headers: {
          'api-key': DONATION_SAVE_BACKUP_API_SECRET,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
        },
      },
    );

    if (result.status !== 200) {
      logger.error('getDonationsFromBackup error', result.data);
      throw new Error('getDonationsFromBackup error');
    }
  }

  async getSingleDonationFromBackupById(
    donationMongoId: string,
  ): Promise<FetchedSavedFailDonationInterface | null> {
    const result = await axios.post(
      `${baseUrl}findOne`,
      {
        collection: DONATION_SAVE_BACKUP_COLLECTION,
        database: DONATION_SAVE_BACKUP_DATABASE,
        dataSource: DONATION_SAVE_BACKUP_DATA_SOURCE,
        filter: {
          _id: { $oid: donationMongoId },
        },
      },
      {
        headers: {
          'api-key': DONATION_SAVE_BACKUP_API_SECRET,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
        },
      },
    );

    if (result.status !== 200) {
      logger.error('getDonationsFromBackup error', result.data);
      throw new Error('getDonationsFromBackup error');
    }
    return result.data.document;
  }

  async unmarkDonationAsImported(donationMongoId: string): Promise<void> {
    const result = await axios.post(
      `${baseUrl}updateOne`,
      {
        collection: DONATION_SAVE_BACKUP_COLLECTION,
        database: DONATION_SAVE_BACKUP_DATABASE,
        dataSource: DONATION_SAVE_BACKUP_DATA_SOURCE,
        filter: {
          _id: { $oid: donationMongoId },
        },
        update: {
          $unset: {
            imported: '',
          },
        },
      },
      {
        headers: {
          'api-key': DONATION_SAVE_BACKUP_API_SECRET,
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
        },
      },
    );

    if (result.status !== 200) {
      logger.error('getDonationsFromBackup error', result.data);
      throw new Error('getDonationsFromBackup error');
    }
  }
}
