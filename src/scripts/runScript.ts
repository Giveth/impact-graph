import { syncDonationsWithBlockchainData } from './syncDataWithInverter';
import { logger } from '../utils/logger';

syncDonationsWithBlockchainData()
  .then(() => {
    logger.info('Data synced successfully.');
    process.exit();
  })
  .catch(error => {
    logger.error('Error syncing data:', error);
    process.abort();
  });
