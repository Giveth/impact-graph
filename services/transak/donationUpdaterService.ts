import { Donation } from '../../entities/donation';
import DonationTracker from '../segment/DonationTracker';
import transakOrder from './order';
/**
 * Will Update the Donation based on the Transak Order values
 * And notify the donation update to segment
 */
class DonationUpdaterService {
    transakOrder: transakOrder

    TRANSAK_COMPLETED_STATUSES = ["COMPLETED", "PAYMENT_DONE_MARKED_BY_USER"]

    constructor(decryptedOrderObject: transakOrder) {
        this.transakOrder = decryptedOrderObject;
    }

    async execute() {
        const donation = await Donation.findOne({ transakId: this.transakOrder.transakId })
        if (!donation) throw new Error('Donation not found.')

        donation.transakStatus = this.transakOrder.transakStatus;
        await donation.save()

        if (this.TRANSAK_COMPLETED_STATUSES.includes(this.transakOrder.transakStatus)) {
            const segmentDonation = new DonationTracker(donation, "Transak Donation Update")
            await segmentDonation.track()
        }
    }
}

export default DonationUpdaterService;
