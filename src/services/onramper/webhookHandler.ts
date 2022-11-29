import { logger } from '../../utils/logger';
import { createFiatDonationFromOnramper } from './donationService';
import { OnRamperFiatTransaction } from './fiatTransaction';

// tslint:disable:no-var-requires
const sha256 = require('js-sha256');
const onramperSecret = process.env.ONRAMPER_SECRET as string;

/**
 * Returns status 200 always, most providers require this or they will keep sending requests indefinitely
 * @see { https://docs.onramper.com/API-Reference/#webhooks}
 */
export async function onramperWebhookHandler(request, response) {
  try {
    const payloadSignature =
      request.headers['X-Onramper-Webhook-Signature'] ||
      request.headers['x-onramper-webhook-signature'];
    if (!onramperSecret || !payloadSignature)
      throw new Error(i18n.__('ONRAMPER_SIGNATURE_MISSING'));

    const fiatTransaction = request.body as OnRamperFiatTransaction;
    const fiatTransactionStringified = JSON.stringify(fiatTransaction);

    const digestedHmac = sha256.hmac(
      onramperSecret,
      fiatTransactionStringified,
    );
    if (digestedHmac !== payloadSignature)
      throw i18n.__('ONRAMPER_SIGNATURE_INVALID');

    // No point saving pending or failed transactions without txHash
    if (fiatTransaction.type === 'transaction_completed') {
      await createFiatDonationFromOnramper(fiatTransaction);
    }

    logger.info(
      'User Onramper Transaction Arrived',
      JSON.stringify({
        type: fiatTransaction.type,
        partnerContext: fiatTransaction.payload.partnerContext,
        txId: fiatTransaction.payload.txId,
      }),
    );

    response.status(200).send();
  } catch (error) {
    logger.error('onramperWebhookHandler() error ', error);
    response.status(403).send();
  }
}
