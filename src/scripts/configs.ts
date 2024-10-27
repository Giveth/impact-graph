import path from 'path';

export const streamStartDate = 1730196000; // Oct 29, 2024, 10am GMT
export const streamEndDate = 1793268000; // Oct 29, 2026, 10am GMT
export const streamCliff = 31536000; // 1 year in secs = 365 * 24 * 60 * 60

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
