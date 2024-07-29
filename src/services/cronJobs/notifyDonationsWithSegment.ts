import { schedule } from 'node-cron';
import { Donation, DONATION_STATUS } from '../../entities/donation.js';
import { logger } from '../../utils/logger.js';
import { sleep } from '../../utils/utils.js';
import config from '../../config.js';
import { sendNotificationForDonation } from '../donationService.js';

const cronJobTime =
  (config.get(
    'NOTIFY_SEGMENT_OF_MISSED_DONATIONS_CRONJOB_EXPRESSION',
  ) as string) || '0 0 * * *';

export const runNotifyMissingDonationsCronJob = () => {
  logger.debug('runNotifyMissingDonationsCronJob() has been called');
  schedule(cronJobTime, async () => {
    await notifyMissingDonationsWithSegment();
  });
};

// As Segment sometimes fail, this is a Best Effort service
export const notifyMissingDonationsWithSegment = async () => {
  const donations = await Donation.createQueryBuilder('donation')
    .where({ segmentNotified: false, status: DONATION_STATUS.VERIFIED })
    .getMany();
  logger.debug(
    'notifyMissingDonationsWithSegment donations count',
    donations.length,
  );
  for (const donation of donations) {
    logger.debug(
      'notifyMissingDonationsWithSegment() sending notification for donation id',
      donation.id,
    );
    await sendNotificationForDonation({
      donation,
    });
    // await enough for segment limit to regen
    await sleep(1000);
  }
};
