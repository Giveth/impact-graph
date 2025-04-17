/* eslint-disable no-console */
import fs from 'fs-extra';
import { ethers } from 'ethers';
import {
  streamCliffForQacc,
  streamEndDateForQacc,
  streamStartDateForQacc,
  ONE_MONTH_IN_SEC,
  initialSupplyOfFirstSeasonProjects,
} from './configs';
import { AppDataSource } from '../orm';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { QfRound } from '../entities/qfRound';
import { Project } from '../entities/project';
import bondingCurveABI from '../abi/bondingCurveABI';
import { getProvider, QACC_NETWORK_ID } from '../provider';
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

export function getStreamDetails(project: Project, seasonNumber: number) {
  return {
    START: streamStartDateForQacc,
    CLIFF:
      seasonNumber === project.seasonNumber
        ? streamCliffForQacc
        : streamCliffForQacc -
          (project.seasonNumber! - seasonNumber) * ONE_MONTH_IN_SEC,
    END:
      seasonNumber === project.seasonNumber
        ? streamEndDateForQacc
        : streamEndDateForQacc -
          (project.seasonNumber! - seasonNumber) * 2 * ONE_MONTH_IN_SEC,
  };
}

export async function getLimitsForProject(project: Project, round: QfRound) {
  let currentlyRecivedFounds = 0;

  if (project.seasonNumber === 1) {
    const bondingCurveContract = new ethers.Contract(
      project.abc.fundingManagerAddress,
      bondingCurveABI,
      getProvider(QACC_NETWORK_ID),
    );
    const currentVirtualCollateralSupply: bigint =
      await bondingCurveContract.getVirtualCollateralSupply();
    const currentVirtualCollateralSupplyInPOL = ethers.utils.formatEther(
      currentVirtualCollateralSupply,
    );
    currentlyRecivedFounds =
      Number(currentVirtualCollateralSupplyInPOL) -
      initialSupplyOfFirstSeasonProjects;
  }
  return {
    INDIVIDUAL: (round.roundPOLCapPerUserPerProject || '5000').toString(), // Default to 5000 for individual cap
    INDIVIDUAL_2: (
      round.roundPOLCapPerUserPerProjectWithGitcoinScoreOnly || '1000'
    ).toString(), // Only required for QACC rounds if for users with GP score only
    TOTAL: (
      Number(round.roundPOLCapPerProject || '1000000') - currentlyRecivedFounds
    ).toString(), // Default to 1000000 for total limit
    TOTAL_2: (
      Number(round.roundPOLCloseCapPerProject || '1050000') -
      currentlyRecivedFounds
    ).toString(), // Only required for QACC rounds
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

export function getProjectNameBasedOnSeasonNumber(project: Project) {
  let screamingSnakeCaseTitle = toScreamingSnakeCase(project.title);
  if (project.seasonNumber && project.seasonNumber < 2) {
    screamingSnakeCaseTitle = `${screamingSnakeCaseTitle}_2`;
  }
  return screamingSnakeCaseTitle;
}

export async function getRoundBySeasonNumberAndBatchNumber(
  seasonNumber: number,
  batchNumber: number,
) {
  const datasource = AppDataSource.getDataSource();
  const qfRoundRepository = datasource.getRepository(QfRound);

  const qfRounds = await qfRoundRepository.find({
    where: { seasonNumber },
  });

  if (qfRounds.length > 1) {
    const sortedQfRounds = qfRounds.sort(
      (a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0),
    );
    const round = sortedQfRounds[batchNumber - 1];
    if (!round) {
      throw new Error(
        `No QF round found for season number ${seasonNumber} and batch number ${batchNumber}`,
      );
    }
    return round;
  }

  return qfRounds[0];
}
