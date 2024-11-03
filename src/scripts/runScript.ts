/* eslint-disable no-console */
import { syncDonationsWithIndexerData } from './syncDataWithInverter';
import { AppDataSource } from '../orm';

// Main function to pull reports and sync donations
async function main() {
  try {
    console.debug(
      'run sync script before AppDataSource.initialize()',
      new Date(),
    );
    await AppDataSource.initialize(false);
    console.debug(
      'run sync script after AppDataSource.initialize()',
      new Date(),
    );
    console.info('Start syncing data with indexer...');
    await syncDonationsWithIndexerData();
    console.info('Data synced successfully.');
    process.exit();
  } catch (error) {
    console.error('Error syncing data:', error);
    process.abort();
  }
}

// Run the main function
main();
