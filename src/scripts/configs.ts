import path from 'path';

export const streamStartDate = 1729500000; // should be timestamp of deploying funding pot contract in secs

// The URL of the GitHub repository containing the reports
export const repoUrl = 'https://github.com/InverterNetwork/funding-pot.git';
// Local directory for cloning or pulling the latest reports
export const repoLocalDir = path.join(__dirname, '/funding-pot-repo');
// Subdirectory inside the repo where reports are located
export function getReportsSubDir() {
  let reportsSubDir = 'data/';
  if (process.env.NODE_ENV !== 'production') {
    reportsSubDir += 'test';
  } else {
    reportsSubDir += 'production';
  }
  reportsSubDir += '/output';
  return reportsSubDir;
}
