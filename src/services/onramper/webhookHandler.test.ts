import axios from 'axios';
import { assert } from 'chai';
import { serverBaseAddress } from '../../../test/testUtils';
import { Donation } from '../../entities/donation';

describe('onramperWebhookHandlerTestCases', onramperWebhookHandlerTestCases);

const payload = {
  type: 'transaction_completed',
  summary: '',
  payload: {
    onramperTxId: 'O4x_YoHNLTEcgHDYnTHTbA--',
    txId: '6c4d4395-97dc-46f6-86c2-ff80278d6068',
    gatewayIdentifier: 'Transak',
    timestamp: 1669671063842 * 1000,
    inCurrency: 'CHF',
    inAmount: 29,
    outCurrency: 'ETH',
    outAmount: 0.02347075,
    medium: 'creditCard',
    partnerContext:
      '{"userId":"1","userWallet":"0x00d18ca9782be1caef611017c2fbc1a39779a57c","projectWallet":"0x76a1F47f8d998D07a15189a07d9aADA180E09aC6","projectId":"1"}',
    wallet: '0x76a1F47f8d998D07a15189a07d9aADA180E09aC6',
    txHash:
      '0x914557b20101eea80f6260511ad2698061a940a1e9ef0c2d35aac85ef62a8aac',
  },
};

const transactionId =
  '0x914557b20101eea80f6260511ad2698061a940a1e9ef0c2d35aac85ef62a8aac';

function onramperWebhookHandlerTestCases() {
  it('should return error 403 if the hmac-sha256 signature is invalid', async () => {
    try {
      await axios.post(`${serverBaseAddress}/fiat_webhook`, payload, {
        headers: {
          'x-onramper-webhook-signature': 'xxxxxx',
        },
      });
    } catch (e) {
      const status = e.response.status;
      assert.equal(status, 403);
    }
  });
  it('should return error if the hmac-sha256 signature header is missing', async () => {
    try {
      await axios.post(`${serverBaseAddress}/fiat_webhook`, payload);
    } catch (e) {
      const status = e.response.status;
      assert.equal(status, 403);
    }
  });
  it('should create donation succesfully with onramper data with valid hmac', async () => {
    const result = await axios.post(
      `${serverBaseAddress}/fiat_webhook`,
      payload,
      {
        headers: {
          'x-onramper-webhook-signature':
            'cc60c9e8a16cc80ad1805983939a729eac4a3777d88671489933a58e0c8c3084',
        },
      },
    );
    assert.isOk(result);
    assert.equal(result.status, 200);
    const ethMainnetAddress = '0x0000000000000000000000000000000000000000';

    const createdDonation = await Donation.createQueryBuilder('donation')
      .where('donation.transactionId = :transactionId', { transactionId })
      .getOne();

    assert.isOk(createdDonation);
    assert.equal(createdDonation!.userId, 1);
    assert.equal(createdDonation!.projectId, 1);
    assert.equal(createdDonation!.amount, payload.payload.outAmount);
    assert.equal(createdDonation!.currency, payload.payload.outCurrency);
    assert.equal(createdDonation!.tokenAddress, ethMainnetAddress);
  });
}
