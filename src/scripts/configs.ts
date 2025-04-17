import path from 'path';

export const collectionName = 'reportsForSeason2';
export const streamStartDateForQacc = 1744847390; // TODO: update this for production
export const streamEndDateForQacc = 1776383390; // TODO: update this for production
// 182 days is sec
export const streamCliffForQacc = 15724800;
// 30 days is sec
export const ONE_MONTH_IN_SEC = 2592000;

export const initialSupplyOfFirstSeasonProjects = 250000; // 250k POL // TODO: update this for production

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

export const reportFilesDir = path.join(repoLocalDir, getReportsSubDir());
