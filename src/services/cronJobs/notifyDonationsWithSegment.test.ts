import { assert } from 'chai';
import 'mocha';
import { DONATION_SEED_DATA } from '../../../test/testUtils';
import sinon from 'sinon';
import { Donation } from '../../entities/donation';
import { notifyMissingDonationsWithSegment } from './notifyDonationsWithSegment';
import * as utils from '../../utils/utils';

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
    const notNotifiedDonations = await Donation.find({
      segmentNotified: false,
    });
    assert.notEqual(
      unnotifiedDonation?.segmentNotified,
      afterNotifiedDonation?.segmentNotified,
    );
    assert.equal(afterNotifiedDonation?.segmentNotified, true);
    assert.equal(notNotifiedDonations?.length, 0);
  });
}
