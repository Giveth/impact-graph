import { Donation } from '../../entities/donation';
import DonationTracker from '../segment/DonationTracker';
import { Project } from '../../entities/project';
import transakOrder from './order';
import { User } from '../../entities/user';

/**
 * Will Update the Donation based on the Transak Order values
 * And notify the donation update to segment
 */
class DonationUpdaterService {
    transakOrder: transakOrder

    TRANSAK_COMPLETED_STATUS = "COMPLETED"

    constructor(decryptedOrderObject: transakOrder) {
        this.transakOrder = decryptedOrderObject;
    }

    async execute() {
        const donation = await Donation.findOne({ transakId: this.transakOrder.transakId })
        if (!donation) throw new Error('Donation not found.')

        donation.transakStatus = this.transakOrder.transakStatus;
        await donation.save()

        if (this.TRANSAK_COMPLETED_STATUS === donation.transakStatus) {
            this.notifyTransakUpdate(donation)
        }
    }

    private async notifyTransakUpdate(donation) {
        const project = await Project.findOne({ id: donation.projectId })
        const owner = await User.findOne({ id: Number(project?.admin) })

        // Notify Owner of donation, and notify authenticated user his donation was received
        if (project && owner) {
            new DonationTracker(donation, project, owner, "Donation received").track()

            // anonymous boolean is inverted in our db and code. Anonymous Users are the authenticated.
            if (donation.anonymous) {
                const donor = await User.findOne({ id: donation.userId })

                if (donor) new DonationTracker(donation, project, donor, "Made donation")
            }
        }
    }
}

export default DonationUpdaterService;
