import { User } from '../../entities/user';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { getAnalytics, SegmentEvents } from '../../analytics/analytics';

const analytics = getAnalytics();

/**
 * Notifies Segment any event concerning the donation
 */
class DonationTracker {
  donation: Donation;
  eventName: SegmentEvents;
  project: Project;
  user: User;

  constructor(
    donationToUpdate: Donation,
    projectToNotify: Project,
    userToNotify: User,
    eventTitle: SegmentEvents,
  ) {
    this.donation = donationToUpdate;
    this.project = projectToNotify;
    this.user = userToNotify;
    this.eventName = eventTitle;
  }

  track() {
    analytics.track(
      this.eventName,
      this.user.segmentUserId(),
      this.segmentDonationAttributes(),
      this.user.segmentUserId(),
    );
  }

  private segmentDonationAttributes() {
    return {
      email: this.user.email,
      title: this.project.title,
      firstName: this.user.firstName,
      projectOwnerId: this.project.admin,
      slug: this.project.slug,
      amount: Number(this.donation.amount),
      transactionId: this.donation.transactionId.toLowerCase(),
      transactionNetworkId: Number(this.donation.transactionNetworkId),
      currency: this.donation.currency,
      createdAt: new Date(),
      toWalletAddress: this.donation.toWalletAddress.toLowerCase(),
      fromWalletAddress: this.donation.fromWalletAddress.toLowerCase(),
      donationValueUsd: this.donation.valueUsd,
      donationValueEth: this.donation.valueEth,
      verified: Boolean(this.project.verified),
      transakStatus: this.donation.transakStatus,
    };
  }
}

export default DonationTracker;
