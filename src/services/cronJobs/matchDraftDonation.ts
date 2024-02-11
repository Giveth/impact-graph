import config from '../../config';

const cronJobTime =
  (config.get('MATCH_DRAFT_DONATION_CRONJOB_EXPRESSION') as string) ||
  '0 */5 * * *';

const TWO_MINUTES = 1000 * 60 * 2;

// Queue for filling snapshot balances

// Periodically log the queue count
