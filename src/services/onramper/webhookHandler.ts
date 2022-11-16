import { logger } from '../../utils/logger';

/**
 * Returns status 200 always, most providers require this or they will keep sending requests indefinitely
 */
export async function onramperWebhookHandler(request, response) {
  try {
    // logic is on another branch this is temporary
    response.status(200).send();
  } catch (error) {
    logger.error('onramperWebhookHandler() error ', error);
    response.status(403).send();
  }
}
