import { assert } from 'chai';
import 'mocha';
import {
  createDonationData,
  saveDonationDirectlyToDb,
  SEED_DATA,
} from '../../../test/testUtils';
import sinon from 'sinon';
import { Donation, DONATION_STATUS } from '../../entities/donation';
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

    const verifiedDonation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
        status: DONATION_STATUS.VERIFIED,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    const pendingDonation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
        status: DONATION_STATUS.PENDING,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    const failedDonation = await saveDonationDirectlyToDb(
      {
        ...createDonationData(),
        segmentNotified: false,
        status: DONATION_STATUS.FAILED,
      },
      SEED_DATA.FIRST_USER.id,
      SEED_DATA.FIRST_PROJECT.id,
    );

    await notifyMissingDonationsWithSegment();
    const updatedVerifiedDonation = await Donation.findOne(verifiedDonation.id);
    const updatedPendingDonation = await Donation.findOne(pendingDonation.id);
    const updatedFailedDonation = await Donation.findOne(failedDonation.id);
    assert.isTrue(updatedVerifiedDonation?.segmentNotified);
    assert.isFalse(updatedPendingDonation?.segmentNotified);
    assert.isFalse(updatedFailedDonation?.segmentNotified);
  });
  describe('after the notifyMissingDonationsWithSegment() ran', () => {
    // All verified donations should be notified and other donations should not be notified

    // TODO saveDonation mutations creates pending donations with segmentNotifed:true, after removing that
    // mutation we can uncomment this test case
    // it('should have not notified unverified donations', async () => {
    //   const notifiedUnVerifiedDonations = await Donation.createQueryBuilder(
    //     'donation',
    //   )
    //     .where({ segmentNotified: true })
    //     .andWhere(`donation.status != '${DONATION_STATUS.VERIFIED}'`)
    //     .getMany();
    //   assert.isEmpty(notifiedUnVerifiedDonations);
    // });

    it('should have notified all verified donations', async () => {
      const notNotifiedVerifiedDonations = await Donation.createQueryBuilder(
        'donation',
      )
        .where({ segmentNotified: false })
        .andWhere(`(donation.status = '${DONATION_STATUS.VERIFIED}')`)
        .getMany();

      assert.isEmpty(notNotifiedVerifiedDonations);
    });
  });
}
