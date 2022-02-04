import { assert } from 'chai';
import 'mocha';
import { DONATION_SEED_DATA } from '../../../test/testUtils';
import sinon from 'sinon';
import { Donation } from '../../entities/donation';
import { notifyMissingDonationsWithSegment } from './notifyDonationsWithSegment';
import * as utils from '../../utils/utils';
import { TRANSAK_COMPLETED_STATUS } from '../../services/donationService';
import { Not } from 'typeorm';

describe(
  'notifyMissingDonationsWithSegment() test cases',
  notifyMissingDonationsWithSegmentTestCases,
);

function notifyMissingDonationsWithSegmentTestCases() {
  it('should call segment per donation not notified', async () => {
    // ignore sleep function to optimize test times
    sinon.stub(utils, 'sleep').resolves(true);

    const unnotifiedDonation = await Donation.findOne({
      id: DONATION_SEED_DATA.SECOND_DONATION.id,
    });
    await notifyMissingDonationsWithSegment();

    const afterNotifiedDonation = await Donation.findOne({
      id: DONATION_SEED_DATA.SECOND_DONATION.id,
    });
    assert.notEqual(
      unnotifiedDonation?.segmentNotified,
      afterNotifiedDonation?.segmentNotified,
    );
    assert.equal(afterNotifiedDonation?.segmentNotified, true);
  });
  describe('after the notifyMissingDonationsWithSegment() ran', () => {
    it('should have not notified incompleted transak donations', async () => {
      const incompletedTransakDonations = await Donation.find({
        where: [
          { segmentNotified: false, transakStatus: Not(null) },
          {
            segmentNotified: false,
            transakStatus: Not(TRANSAK_COMPLETED_STATUS),
          },
        ],
      });
      const notNotifiedDonations = await Donation.find({
        where: [
          { segmentNotified: false, transakStatus: null },
          { segmentNotified: false, transakStatus: TRANSAK_COMPLETED_STATUS },
        ],
      });

      // cronjob ignores incompleted transak donations and they remain unnotified
      assert.equal(notNotifiedDonations?.length, 0);
      assert.equal(incompletedTransakDonations?.length, 1);
    });
  });
}
