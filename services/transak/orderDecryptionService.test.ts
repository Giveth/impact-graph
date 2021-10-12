import { assert, expect } from 'chai'
import { assertType } from 'graphql';
import 'mocha'
import OrderDecryptionService from './orderDecryptionService'

const jwt = require('jsonwebtoken');

const transakOrderDecryptionTestCases = () => {
    const decryptedPayload = {
        createdAt: '2021-10-12T17:57:38.285Z',
        eventID: 'ORDER_CREATED',
        webhookData: { status: 'AWAITING_PAYMENT_FROM_USER' }
    }
    const encryptedDonation = jwt.sign(decryptedPayload, process.env.TRANSAK_API_SECRET)

    it('decrypts succesfully the transak order payload', () => {
        const decryptionService = new OrderDecryptionService(encryptedDonation)
        const decryptedDonation = decryptionService.execute()
        assert.equal(decryptedDonation.transakStatus, decryptedPayload.webhookData.status);
    })

    it('throws an error when payload is incorrect', () =>{
        const wrongEncryptedData = 'wrongdata'
        const decryptionService = new OrderDecryptionService(wrongEncryptedData)
        expect(() => decryptionService.execute()).to.throw()
    })
}

describe('transakOrderDecryptionService Test Cases', transakOrderDecryptionTestCases)