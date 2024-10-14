import path from 'path';

// Path to the local reports directory inside the repo
export const reportsDir = path.join(__dirname, 'reportFiles/output');
// The URL of the GitHub repository containing the reports
export const repoUrl = 'https://github.com/ae2079/funding-pot.git';
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
