import donationUpdaterService from './donationUpdaterService';
import orderDecryptionService from './orderDecryptionService';
import transakOrder from './order';

class WebhookHandler {
    encryptedOrder: string
    order: transakOrder;

    constructor(encryptedOrderHash: string) {
        this.encryptedOrder = encryptedOrderHash
    }

    execute() {
        console.log("IT ENTERED HERE")
        this.decryptOrder()
        return this.updateOrderStatus()
    }

    private decryptOrder() {
        const decryptionService = new orderDecryptionService(this.encryptedOrder)
        this.order = decryptionService.execute()
    }

    private updateOrderStatus() {
        console.log(this.order)
        const donationUpdater = new donationUpdaterService(this.order)
        return donationUpdater.execute()
    }
}

/**
   * Returns status 200 always, most providers require this or they will keep sending requests indefinitely
   * Logs the Error if there is any
   */
async function webhookHandler(request, response, next) {
    try {
        const webhookHandler = new WebhookHandler(request.body.data)
        await webhookHandler.execute()
        response.status(200).send()
    } catch (error) {
        console.error(error)
        response.status(403).send()
    }
}

export default webhookHandler;
