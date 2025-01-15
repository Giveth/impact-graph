/* eslint-disable no-console */
import fs from 'fs-extra';
import {
  SIX_MONTH_IN_SEC_182,
  streamCliff,
  streamEndDate,
  streamEndDateForQacc,
  streamStartDate,
  streamStartDateForQacc,
} from './configs';
import { AppDataSource } from '../orm';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { QfRound } from '../entities/qfRound';

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

export function getStreamDetails(isEarlyAccess: boolean) {
  return {
    START: isEarlyAccess ? streamStartDate : streamStartDateForQacc,
    CLIFF: isEarlyAccess ? streamCliff : SIX_MONTH_IN_SEC_182,
    END: isEarlyAccess ? streamEndDate : streamEndDateForQacc,
  };
}

export async function getRoundByBatchNumber(batchNumber: number) {
  const datasource = AppDataSource.getDataSource();
  const earlyAccessRoundRepository = datasource.getRepository(EarlyAccessRound);
  const qfRoundRepository = datasource.getRepository(QfRound);

  // Step 1: Check if an Early Access Round exists for the given batchNumber
  let round: any;
  let isEarlyAccess = true; // Set this to true if it's an Early Access Round by default

  round = await earlyAccessRoundRepository.findOne({
    where: { roundNumber: batchNumber },
  });

  if (!round) {
    // No Early Access Round found, fallback to QF Round
    isEarlyAccess = false;

    // Step 2: Get the last Early Access Round to adjust the round number
    const lastEarlyAccessRound = await earlyAccessRoundRepository
      .createQueryBuilder('eaRound')
      .orderBy('eaRound.roundNumber', 'DESC')
      .getOne();

    const lastEarlyAccessRoundNumber = lastEarlyAccessRound
      ? lastEarlyAccessRound.roundNumber
      : 0;

    // Step 3: Find the QF Round, add it to the number of the last Early Access Round
    const qfRound = await qfRoundRepository.findOne({
      where: { roundNumber: batchNumber - lastEarlyAccessRoundNumber },
    });

    // Step 4: If no QF round is found, throw an error
    if (!qfRound) {
      throw new Error(
        `No Early Access or QF round found for batch number ${batchNumber}`,
      );
    }
    round = qfRound;
  }

  return { round, isEarlyAccess };
}
