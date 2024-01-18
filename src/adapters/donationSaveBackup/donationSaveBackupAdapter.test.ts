// test calling the donationSaveBackupAdapter get getDonationsFromBackup method

import { assert } from 'chai';
import {
  getNotImportedDonationsFromBackup,
  getSingleDonationFromBackupById,
  getSingleDonationFromBackupByTxHash,
  markDonationAsImported,
  unmarkDonationAsImported,
} from './donationSaveBackupAdapter';

describe('Donation Save Backup Adapter Test Cases', () => {
  it('should return a list of donations', async () => {
    const result = await getNotImportedDonationsFromBackup(2);
    assert.lengthOf(result, 2);
  });

  it('get a single donation by id', async () => {
    const result = await getNotImportedDonationsFromBackup(1);
    const singleResult = await getSingleDonationFromBackupById(result[0]._id);
    assert.ok(singleResult);
    assert.equal(singleResult._id, result[0]._id);
  });

  it('get single donation by txHash', async () => {
    const result = await getNotImportedDonationsFromBackup(1);
    const singleResult = await getSingleDonationFromBackupByTxHash(
      result[0].txHash,
    );
    assert.ok(singleResult);
    assert.equal(singleResult._id, result[0]._id);
  });

  it('should mark a donation as imported', async function () {
    const result = await getNotImportedDonationsFromBackup(1);

    if (result.length === 0) {
      // tslint:disable-next-line:no-console
      console.log('no donations to test');
      this.skip();
    }

    await markDonationAsImported(result[0]._id);
    let newObject = await getSingleDonationFromBackupById(result[0]._id);
    assert.isTrue(newObject.imported);
    await unmarkDonationAsImported(result[0]._id);
    newObject = await getSingleDonationFromBackupById(result[0]._id);
    assert.isNotTrue(newObject.imported);
  });
});
