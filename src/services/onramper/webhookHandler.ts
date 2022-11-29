import { createFiatDonationFromOnramper } from './donationService';
// import { TransakOrder } from './order';
import { logger } from '../../utils/logger';
import { OnRamperFiatTransaction } from './fiatTransaction';
import { i18n } from '../../utils/errorMessages';

// tslint:disable:no-var-requires
const verifyHmac256 = require('verify-hmac-sha');
const onramperSecret = process.env.ONRAMPER_SECRET as string;

/**
 * Returns status 200 always, most providers require this or they will keep sending requests indefinitely
 * Logs the Error if there is any
 * @see { https://transak.stoplight.io/docs/transak-docs/ZG9jOjExNDgyMzI-webhooks}
 */
export async function onramperWebhookHandler(request, response) {
  try {
    const payloadSignature = request.headers['X-Onramper-Webhook-Signature'];
    if (!onramperSecret || !payloadSignature)
      throw new Error(i18n.__('ONRAMPER_SIGNATURE_MISSING'));

    const fiatTransaction = request.body as OnRamperFiatTransaction;
    const fiatTransactionStringified = JSON.stringify(fiatTransaction);
    const valid = verifyHmac256.encodeInHex.verify({
      payloadSignature,
      onramperSecret,
      fiatTransactionStringified,
    });

    if (!valid) throw i18n.__('ONRAMPER_SIGNATURE_INVALID');

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
