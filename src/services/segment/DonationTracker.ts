import { User } from '../../entities/user';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import {
  getAnalytics,
  NOTIFICATIONS_EVENT_NAMES,
} from '../../analytics/analytics';

const analytics = getAnalytics();

interface DonationAttributes {
  email?: String;
  title?: String;
  firstName?: String;
  projectOwnerId?: String;
  slug?: String;
  amount?: Number;
  transactionId?: String;
  transactionNetworkId?: Number;
  currency?: String;
  createdAt?: Date;
  toWalletAddress?: String;
  fromWalletAddress?: String;
  donationValueUsd?: Number;
  donationValueEth?: Number;
  verified?: Boolean;
  transakStatus?: String;
}

/**
 * Notifies Segment any event concerning the donation
 */
class DonationTracker {
  donation: Donation;
  eventName: NOTIFICATIONS_EVENT_NAMES;
  project: Project;
  user: User;

  constructor(
    donationToUpdate: Donation,
    projectToNotify: Project,
    userToNotify: User,
    eventTitle: NOTIFICATIONS_EVENT_NAMES,
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

  // it's partial because anonymous has less values
  segmentDonationAttributes(): Partial<DonationAttributes> {
    const donationAttributes = {
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
    } as Partial<DonationAttributes>;

    if (this.eventName === NOTIFICATIONS_EVENT_NAMES.DONATION_RECEIVED) {
      delete donationAttributes.fromWalletAddress;
    }

    return donationAttributes;
  }
}

export default DonationTracker;
