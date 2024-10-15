/* eslint-disable no-console */
import fs from 'fs-extra';

// Function to ensure directory exists or create it
export function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    console.info(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
