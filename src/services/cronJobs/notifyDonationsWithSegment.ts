import { Donation } from '../../entities/donation';
import { logger } from '../../utils/logger';
import { getAnalytics, SegmentEvents } from '../../analytics/analytics';
import { schedule } from 'node-cron';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import { sleep } from '../../utils/utils';

const analytics = getAnalytics();

const cronJobTime = '*/17 * * * *';

export const runNotifyMissingDonationsCronJob = () => {
  logger.debug('runNotifyMissingDonationsCronJob() has been called');
  schedule(cronJobTime, async () => {
    await notifyMissingDonationsWithSegment();
  });
};

// As Segment sometimes fail, this is a Best Effort service
export const notifyMissingDonationsWithSegment = async () => {
  const donations = await Donation.find({ segmentNotified: false });
  logger.debug(
    'notifyMissingDonationsWithSegment donations count',
    donations.length,
  );
  for (const donation of donations) {
    logger.debug(
      'notifyMissingDonationsWithSegment() sending notification for donation id',
      donation.id,
    );
    const project = await Project.findOne({ id: donation.projectId });
    const owner = await User.findOne({ id: Number(project?.admin) });
    if (project && owner) {
      const receivedDonationAttributes = segmentDonationAttributes(
        project,
        donation,
        owner,
      );
      analytics.identifyUser(owner);

      analytics.track(
        SegmentEvents.DONATION_RECEIVED,
        owner.segmentUserId(),
        receivedDonationAttributes,
        owner.segmentUserId(),
      );
    }

    const user = await User.findOne({ id: donation.userId });
    // Notify user donation was made
    if (project && user) {
      analytics.identifyUser(user);
      const madeDonationAttributes = segmentDonationAttributes(
        project,
        donation,
        user,
      );
      analytics.track(
        SegmentEvents.MADE_DONATION,
        user.segmentUserId(),
        madeDonationAttributes,
        user.segmentUserId(),
      );
    }
    // await enough for segment limit to regen
    await sleep(1000);
    // Notify owner donation was received
    donation.segmentNotified = true;
    await donation.save();
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
