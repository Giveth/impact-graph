/* eslint-disable no-console */
import { syncDonationsWithIndexerData } from './syncDataWithInverter';

// Main function to pull reports and sync donations
async function main() {
  try {
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
