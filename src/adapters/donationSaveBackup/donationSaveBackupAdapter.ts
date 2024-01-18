// a method the get objects from mongodb api read from config DONATION_SAVE_BACKUP_API_URL with sercret read from DONATION_SAVE_BACKUP_API_SECRET,
// it must filter objects by those doesn't have `imported` field with true value
// also must support pagination

import { logger } from '../../utils/logger';
import config from '../../config';
import axios from 'axios';

const DONATION_SAVE_BACKUP_API_URL = config.get(
  'DONATION_SAVE_BACKUP_API_URL',
) as string;
const DONATION_SAVE_BACKUP_API_SECRET = config.get(
  'DONATION_SAVE_BACKUP_API_SECRET',
) as string;

// add '/' if doesn't exist at the
const baseUrl = DONATION_SAVE_BACKUP_API_URL.endsWith('/')
  ? DONATION_SAVE_BACKUP_API_URL
  : `${DONATION_SAVE_BACKUP_API_URL}/`;

export const getNotImportedDonationsFromBackup = async (
  limit = 10,
  skip = 0,
) => {
  const result = await axios.post(
    new URL('find', baseUrl).href,
    {
      collection: 'failed_donation',
      database: 'failed_donation',
      dataSource: 'staging-giveth-donation-backupservice',
      limit,
      skip,
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
};

export const getSingleDonationFromBackupByTxHash = async (txHash: string) => {
  const result = await axios.post(
    new URL('findOne', baseUrl).href,
    {
      collection: 'failed_donation',
      database: 'failed_donation',
      dataSource: 'staging-giveth-donation-backupservice',
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
};
export const getSingleDonationFromBackupById = async (id: string) => {
  const result = await axios.post(
    new URL('findOne', baseUrl).href,
    {
      collection: 'failed_donation',
      database: 'failed_donation',
      dataSource: 'staging-giveth-donation-backupservice',
      filter: {
        _id: { $oid: id },
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
};

export const markDonationAsImported = async (id: string) => {
  const result = await axios.post(
    new URL('updateOne', baseUrl).href,
    {
      collection: 'failed_donation',
      database: 'failed_donation',
      dataSource: 'staging-giveth-donation-backupservice',
      filter: {
        _id: { $oid: id },
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
  return result;
};

export const unmarkDonationAsImported = async (id: string) => {
  const result = await axios.post(
    new URL('updateOne', baseUrl).href,
    {
      collection: 'failed_donation',
      database: 'failed_donation',
      dataSource: 'staging-giveth-donation-backupservice',
      filter: {
        _id: { $oid: id },
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
  return result;
};
