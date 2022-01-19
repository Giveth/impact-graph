import { verify } from 'jsonwebtoken';
import { updateDonationByTransakData } from '../donationService';
import { TransakOrder } from './order';
import { logger } from '../../utils/logger';

/**
 * Returns status 200 always, most providers require this or they will keep sending requests indefinitely
 * Logs the Error if there is any
 * @see { https://transak.stoplight.io/docs/transak-docs/ZG9jOjExNDgyMzI-webhooks}
 */
export async function webhookHandler(request, response) {
  try {
    const transakData = verify(
      request.body.data,
      process.env.TRANSAK_API_SECRET as string,
    ) as TransakOrder;
    await updateDonationByTransakData(transakData);
    response.status(200).send();
  } catch (error) {
    logger.error('webhookHandler() error ', error);
    response.status(403).send();
  }
}
