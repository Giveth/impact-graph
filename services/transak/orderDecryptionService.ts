import transakOrder from './order';

const jwt = require('jsonwebtoken');

/**
 * Decrypts and converts json into a custom object
 */
class OrderDecryptionService {
    encryptedOrder: string

    TRANSAK_API_SECRET = process.env.TRANSAK_API_SECRET;

    constructor(encryptedOrderHash: string) {
        this.encryptedOrder = encryptedOrderHash;
    }

    execute() {
        const decryptedOrder = this.decryptOrder();
        return new transakOrder(decryptedOrder);
    }

    private decryptOrder() {
        return jwt.verify(this.encryptedOrder, this.TRANSAK_API_SECRET);
    }
}

export default OrderDecryptionService;
