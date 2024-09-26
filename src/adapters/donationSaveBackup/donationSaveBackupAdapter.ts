// a method the get objects from mongodb api read from config DONATION_SAVE_BACKUP_API_URL with sercret read from DONATION_SAVE_BACKUP_API_SECRET,
// it must filter objects by those doesn't have `imported` field with true value
// also must support pagination
import * as mongoDB from 'mongodb';
import { logger } from '../../utils/logger';
import config from '../../config';
import {
  DonationSaveBackupInterface,
  FetchedSavedFailDonationInterface,
} from './DonationSaveBackupInterface';

import { getMongoDB } from '../../utils/db';

const DONATION_SAVE_BACKUP_COLLECTION = String(
  config.get('DONATION_SAVE_BACKUP_COLLECTION') || 'failed_donation',
);

export class DonationSaveBackupAdapter implements DonationSaveBackupInterface {
  async getNotImportedDonationsFromBackup(params: {
    limit: number;
  }): Promise<FetchedSavedFailDonationInterface[]> {
    try {
      const db = await getMongoDB();
      const collection = db.collection(DONATION_SAVE_BACKUP_COLLECTION);

      const result = await collection
        .find({
          // imported: { $exists: false },
          // importError: { $exists: false },
          projectId: 223479,
        })
        .sort({ _id: 1 })
        .limit(params.limit)
        .toArray();

      // Ensure _id is converted to string
      const donations = result.map(doc => ({
        ...doc,
        _id: (doc._id as mongoDB.ObjectId).toString(), // Ensure _id is converted to string
      }));

      //  match the return type
      return donations as unknown as FetchedSavedFailDonationInterface[];
    } catch (e) {
      logger.error('getNotImportedDonationsFromBackup error', e);
      throw e;
    }
  }

  async getSingleDonationFromBackupByTxHash(
    txHash: string,
  ): Promise<FetchedSavedFailDonationInterface | null> {
    try {
      const db = await getMongoDB();
      const collection = db.collection(DONATION_SAVE_BACKUP_COLLECTION);
      const donation = await collection.findOne({ txHash });

      // Ensure _id is converted to string  to match the return type
      return {
        ...donation,
        _id: (donation?._id as mongoDB.ObjectId).toString(),
      } as FetchedSavedFailDonationInterface;
    } catch (error) {
      logger.error('getSingleDonationFromBackupByTxHash error', error);
      throw new Error(`No donation found with the given txHash: ${txHash}`);
    }
  }

  async markDonationAsImported(donationMongoId: string): Promise<void> {
    const db = await getMongoDB();
    const collection = db.collection(DONATION_SAVE_BACKUP_COLLECTION);
    const result = await collection.updateOne(
      { _id: new mongoDB.ObjectId(donationMongoId) },
      { $set: { imported: true } },
    );

    if (result.matchedCount === 0) {
      logger.error(
        'markDonationAsImported error , matchedCound :',
        result.matchedCount,
      );
      throw new Error('No document found with the given ID');
    }
    if (result.modifiedCount === 0) {
      logger.error(
        'markDonationAsImported error, modifiedCount : ',
        result.modifiedCount,
      );
      throw new Error('Failed to mark the donation as imported');
    }
  }

  async markDonationAsImportError(
    donationMongoId: string,
    errorMessage,
  ): Promise<void> {
    const db = await getMongoDB();
    const collection = db.collection(DONATION_SAVE_BACKUP_COLLECTION);
    const result = await collection.updateOne(
      { _id: new mongoDB.ObjectId(donationMongoId) },
      { $set: { importError: errorMessage } },
    );

    if (result.matchedCount === 0) {
      logger.error(
        'markDonationAsImportError error , matchedCount :',
        result.matchedCount,
      );
      throw new Error('No document found with the given ID');
    }

    if (result.modifiedCount === 0) {
      logger.error(
        'markDonationAsImportError error , modifiedCount :',
        result.modifiedCount,
      );
      throw new Error('Failed to mark the donation with the import error');
    }
  }

  async getSingleDonationFromBackupById(
    donationMongoId: string,
  ): Promise<FetchedSavedFailDonationInterface | null> {
    try {
      const db = await getMongoDB();
      const collection = db.collection(DONATION_SAVE_BACKUP_COLLECTION);
      const donation = await collection.findOne({
        _id: new mongoDB.ObjectId(donationMongoId),
      });

      // Ensure _id is converted to string  to match the return type
      return {
        ...donation,
        _id: (donation?._id as mongoDB.ObjectId).toString(),
      } as FetchedSavedFailDonationInterface;
    } catch (error) {
      logger.error('getSingleDonationFromBackupById error', error);
      throw new Error(
        `No donation found with the given Id: ${donationMongoId}`,
      );
    }
  }

  async unmarkDonationAsImported(donationMongoId: string): Promise<void> {
    const db = await getMongoDB();
    const collection = db.collection(DONATION_SAVE_BACKUP_COLLECTION);
    const result = await collection.updateOne(
      { _id: new mongoDB.ObjectId(donationMongoId) },
      { $unset: { imported: '' } },
    );
    if (result.matchedCount === 0) {
      logger.error(
        'unmarkDonationAsImported error ,matchedCount :',
        result.matchedCount,
      );
      throw new Error('No document found with the given ID');
    }
    if (result.modifiedCount === 0) {
      logger.error(
        'unmarkDonationAsImported error ,modifiedCount :',
        result.modifiedCount,
      );
      throw new Error('Failed to unmark the donation as imported');
    }
  }
}
