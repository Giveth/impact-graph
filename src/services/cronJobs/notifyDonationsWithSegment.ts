import { Donation, DONATION_STATUS } from '../../entities/donation';
import { logger } from '../../utils/logger';
import { getAnalytics, SegmentEvents } from '../../analytics/analytics';
import { schedule } from 'node-cron';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import { sleep } from '../../utils/utils';
import config from '../../config';
import { sendSegmentEventForDonation } from '../donationService';

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
    await sendSegmentEventForDonation({
      donation,
    });
    // await enough for segment limit to regen
    await sleep(1000);
  }
};

interface SegmentDonationInterFace {
  slug?: string;
  title: string;
  amount: number;
  transactionId: string;
  toWalletAddress: string;
  fromWalletAddress: string;
  donationValueUsd: number;
  donationValueEth: number;
  verified: boolean;
  projectOwnerId: number;
  transactionNetworkId: number;
  currency: string;
  projectWalletAddress?: string;
  createdAt: Date;
  email?: string;
  firstName?: string;
  anonymous: boolean;
}

const segmentDonationAttributes = (
  project: Project,
  donation: Donation,
  user: User,
): SegmentDonationInterFace => {
  return {
    slug: project.slug,
    title: project.title,
    amount: donation.amount,
    transactionId: donation.transactionId.toLowerCase(),
    toWalletAddress: donation.toWalletAddress.toLowerCase(),
    fromWalletAddress: donation.fromWalletAddress.toLowerCase(),
    donationValueUsd: donation.valueUsd,
    donationValueEth: donation.valueEth,
    verified: project.verified,
    projectOwnerId: Number(project.admin),
    transactionNetworkId: donation.transactionNetworkId,
    currency: donation.currency,
    projectWalletAddress: project.walletAddress,
    createdAt: donation.createdAt,
    email: user != null ? user.email : '',
    firstName: user != null ? user.firstName : '',
    anonymous: donation.anonymous,
  };
};
