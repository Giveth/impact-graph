/* eslint-disable no-console */
import fs from 'fs-extra';

// Function to ensure directory exists or create it
export function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    console.info(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
// Function to convert a string to SCREAMING_SNAKE_CASE
export function toScreamingSnakeCase(str: string): string {
  return str
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[a-z]/g, letter => letter.toUpperCase()) // Convert lowercase letters to uppercase
    .replace(/[^A-Z0-9_]/g, ''); // Remove non-alphanumeric characters except underscores
}
