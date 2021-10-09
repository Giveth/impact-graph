import { User } from '../../entities/user';
import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { getAnalytics } from '../../analytics';

const analytics = getAnalytics()

/**
 * Notifies Segment any event concerning the donation
 */
class DonationTracker {
    donation: Donation
    eventName: string
    project?: Project
    userToNotify?: User

    constructor(donationToUpdate: Donation, eventTitle: string) {
        this.donation = donationToUpdate
        this.eventName = eventTitle
    }

    async track() {
        this.project = await Project.findOne({ id: this.donation.projectId })

        if (this.donation.anonymous) {
            this.userToNotify = await User.findOne({ id: Number(this.project?.admin) })
        } else {
            this.userToNotify = await User.findOne({ id: this.donation.userId })
        }

        if(this.project && this.userToNotify) {
            analytics.track(
                this.eventName,
                this.userToNotify.segmentUserId(),
                this.segmentDonationAttributes(),
                this.userToNotify.segmentUserId()
            )
        }
    }

    private segmentDonationAttributes() {
        return {
            email: this.userToNotify?.email,
            title: this.project?.title,
            firstName: this.userToNotify?.firstName,
            projectOwnerId: this.project?.admin,
            slug: this.project?.slug,
            amount: Number(this.donation.amount),
            transactionId: this.donation.transactionId.toString().toLowerCase(),
            transactionNetworkId: Number(this.donation.transactionNetworkId),
            currency: this.donation.currency,
            createdAt: new Date(),
            toWalletAddress: this.donation.toWalletAddress.toString().toLowerCase(),
            fromWalletAddress: this.donation.fromWalletAddress.toString().toLowerCase(),
            donationValueUsd: this.donation.valueUsd,
            donationValueEth: this.donation.valueEth,
            verified: Boolean(this.project?.verified),
            transakStatus: this.donation.transakStatus
        }
    }
}

export default DonationTracker;