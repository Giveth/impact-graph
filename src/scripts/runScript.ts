import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { syncDonationsWithBlockchainData } from './syncDataWithInverter';
import { logger } from '../utils/logger';

// Path to the local reports directory inside the repo
const reportsDir = path.join(__dirname, 'reportFiles/output');
// The URL of the GitHub repository containing the reports
const repoUrl = 'https://github.com/ae2079/funding-pot.git';
// Local directory for cloning or pulling the latest reports
const repoLocalDir = path.join(__dirname, '/fonding-pot-repo');
// Subdirectory inside the repo where reports are located
let reportsSubDir = 'data/';
if (process.env.NODE_ENV !== 'production') {
  reportsSubDir += 'test';
} else {
  reportsSubDir += 'production';
}
reportsSubDir += '/output';

// Function to ensure directory exists or create it
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    logger.info(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Function to pull or clone the latest reports from the GitHub repository
async function pullLatestReports() {
  const git = simpleGit();

  if (!fs.existsSync(repoLocalDir)) {
    logger.info('Cloning reports repository...');
    await git.clone(repoUrl, repoLocalDir);
  } else {
    logger.info('Pulling latest reports from repository...');
    await git.cwd(repoLocalDir).pull();
  }

  // Copy the report files from the subdirectory to the output folder
  const reportFilesDir = path.join(repoLocalDir, reportsSubDir);
  ensureDirectoryExists(reportsDir);

  if (fs.existsSync(reportFilesDir)) {
    fs.emptyDirSync(reportsDir); // Clear the destination folder first
    fs.copySync(reportFilesDir, reportsDir, { recursive: true }); // Copy recursively
    logger.info('Report files copied successfully.');
  } else {
    logger.error(
      `Subdirectory ${reportsSubDir} does not exist in the repository.`,
    );
  }
}

// Main function to pull reports and sync donations
async function main() {
  try {
    // Step 1: Pull the latest reports from GitHub
    await pullLatestReports();
    logger.info('Reports pulled successfully.');

    // Step 2: Sync donations with the blockchain data
    await syncDonationsWithBlockchainData();
    logger.info('Data synced successfully.');
    process.exit();
  } catch (error) {
    logger.error('Error syncing data:', error);
    process.abort();
  }
}

// Run the main function
main();
