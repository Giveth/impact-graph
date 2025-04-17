/* eslint-disable no-console */
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { repoLocalDir, reportFilesDir, repoUrl } from './configs';
import config from '../config';
import { Project } from '../entities/project';
import { AppDataSource } from '../orm';
import {
  ensureDirectoryExists,
  getStreamDetails,
  getRoundBySeasonNumberAndBatchNumber,
  getProjectNameBasedOnSeasonNumber,
  getLimitsForProject,
} from './helpers';
import { EarlyAccessRound } from '../entities/earlyAccessRound';
import { findAllEarlyAccessRounds } from '../repositories/earlyAccessRoundRepository';
import { findQfRounds } from '../repositories/qfRoundRepository';
import { updateRewardsForDonationsOfProject } from './syncDataWithJsonReport';
import { restoreReportsFromDB, saveReportsToDB } from './reportService';

// Attention: the configs of batches should be saved in the funding pot repo
// this script pulls the latest version of funding pot service,
// fill project details and execute it

async function pullLatestVersionOfFundingPot() {
  const git = simpleGit();

  if (!fs.existsSync(repoLocalDir)) {
    console.info('Cloning funding pot repository...');
    await git.clone(repoUrl, repoLocalDir);
  } else {
    console.info('Pulling latest version of funding pot service...');
    await git.cwd(repoLocalDir).pull();
  }
}

async function fillInputData(
  seasonNumber: number,
  projectId: number,
  batchNumber: number,
  dryRun: boolean,
) {
  console.info('Initialize the data source (database connection)...');
  await AppDataSource.initialize(false);
  console.info('Data source initialized.');
  const datasource = AppDataSource.getDataSource();
  const projectRepository = datasource.getRepository(Project);
  console.info(
    `Generating input data for season number: ${seasonNumber}, project id: ${projectId}, batch number: ${batchNumber}`,
  );

  const round = await getRoundBySeasonNumberAndBatchNumber(
    seasonNumber,
    batchNumber,
  );

  const now = new Date();
  const offsetSecs = now.getTimezoneOffset() * 60;

  const project = await projectRepository.findOne({
    where: { id: projectId },
  });

  if (!project) {
    console.error(`Project ${projectId} does not exist!`);
    process.exit();
  }

  const projectName = getProjectNameBasedOnSeasonNumber(project);

  // Define the path to the projects.json file inside funding pot repo
  const filePath = path.join(
    repoLocalDir,
    'data',
    'production',
    'input',
    'projects.json',
  );

  // Ensure the directory exists
  ensureDirectoryExists(path.dirname(filePath));

  let projectsData = {};
  if (fs.existsSync(filePath)) {
    projectsData = await fs.readJson(filePath);
  }
  if (project.abc) {
    projectsData[projectName] = {
      SAFE: project.abc.projectAddress || '',
      ORCHESTRATOR: project.abc.orchestratorAddress || '',
      NFT: project.abc.nftContractAddress || '',
      BATCH_CONFIGS: {
        // Currently, we only have one batch config
        1: {
          TIMEFRAME: {
            FROM_TIMESTAMP:
              Math.floor(new Date(round.beginDate).getTime() / 1000) -
              offsetSecs, // Convert to timestamp
            TO_TIMESTAMP:
              Math.floor(new Date(round.endDate).getTime() / 1000) - offsetSecs,
          },
          VESTING_DETAILS: getStreamDetails(project, seasonNumber),
          LIMITS: await getLimitsForProject(project, round),
          IS_EARLY_ACCESS: false, // Currently, we don't have early access rounds
          PRICE: '1', // based on using the caps as POL amount, use 1 as price
          ONLY_REPORT: dryRun, // If we set this flag, only report will be generated and no transactions propose to the safes
          MATCHING_FUNDS: project.matchingFunds?.toString() || '',
        },
      },
    };
  } else {
    console.warn(`Project ${projectId} does not have abc object. Skipping...`);
  }

  // Write the projects data to the projects.json file
  await fs.writeJson(filePath, projectsData, { spaces: 2 });

  console.info(`Projects data successfully written to ${filePath}`);

  const outputFilePath = path.join(
    repoLocalDir,
    'data',
    'production',
    'output',
    '.keep',
  );

  // create output directory for reports
  ensureDirectoryExists(path.dirname(outputFilePath));

  return projectName;
}

async function createEnvFile() {
  const envExamplePath = path.join(repoLocalDir, '.env.example'); // Path to .env.example in funding pot service
  const envFilePath = path.join(repoLocalDir, '.env'); // Path to the new .env file in funding pot service

  if (!fs.existsSync(envExamplePath)) {
    console.error(`.env.example file not found in ${envExamplePath}`);
    throw new Error('.env.example file not found');
  }

  try {
    const envExampleContent = await fs.readFile(envExamplePath, 'utf-8');

    // Replace placeholders with actual values from the service's environment
    const updatedEnvContent = envExampleContent
      .replace(
        /DELEGATE=/g,
        `DELEGATE=${config.get('DELEGATE_PK_FOR_FUNDING_POT') || ''}`,
      )
      .replace(
        'ANKR_API_KEY=""',
        `ANKR_API_KEY="${config.get('ANKR_API_KEY_FOR_FUNDING_POT') || ''}"`,
      )
      .replace('ANKR_NETWORK_ID="base_sepolia"', 'ANKR_NETWORK_ID=polygon')
      .replace(
        'RPC_URL="https://sepolia.base.org"',
        'RPC_URL="https://polygon.llamarpc.com"',
      )
      .replace('CHAIN_ID=84532', 'CHAIN_ID=137')
      .replace(
        'BACKEND_URL="https://staging.qacc-be.generalmagic.io/graphql"',
        `BACKEND_URL="${config.get('SERVER_URL')}/graphql"`,
      );

    await fs.writeFile(envFilePath, updatedEnvContent, 'utf-8');
  } catch (error) {
    console.error('Error creating .env file:', error.message);
    throw error;
  }
}

// Helper function to execute a shell command
function execShellCommand(command: string, workingDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.info(`Executing command: "${command}" in ${workingDir}...`);

    // Split the command into the command and its arguments
    const [cmd, ...args] = command.split(' ');

    // Use spawn to execute the command
    const process = spawn(cmd, args, { cwd: workingDir });

    // Stream stdout in real-time
    process.stdout.on('data', data => {
      console.log(`stdout: ${data}`);
    });

    // Stream stderr in real-time
    process.stderr.on('data', data => {
      console.error(`stderr: ${data}`);
    });

    // Handle the process exit event
    process.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
  });
}

const serviceDir = path.join(repoLocalDir);

async function installDependencies() {
  console.info(`Installing npm dependencies in ${serviceDir}...`);
  await execShellCommand('npm install --loglevel=error', serviceDir);
}

async function runFundingPotService(
  seasonNumber: number,
  projectName: string,
  batchNumber: number,
  dryRun?: boolean,
) {
  const command = `npm run project ${seasonNumber} ${projectName} ${batchNumber}`;
  console.info(`Running "${command}" in ${serviceDir}...`);
  try {
    await execShellCommand(command, serviceDir);
  } catch (e) {
    console.error('Error in funding pot execution:', e);
  }
  if (!dryRun) {
    console.info('Saving reports to the DB...');
    await saveReportsToDB(reportFilesDir);
  }
}

async function getFirstRoundThatNeedExecuteBatchMinting() {
  console.info('Finding batch number based on rounds data...');
  const allEARounds = await findAllEarlyAccessRounds();

  const EARoundsNeedingBatchMinting = allEARounds
    .filter(round => {
      return !round.isBatchMintingExecuted;
    })
    .sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  // Return the first EA round that needs batch minting execution
  if (EARoundsNeedingBatchMinting.length > 0) {
    if (
      new Date(EARoundsNeedingBatchMinting[0].endDate).getTime() < Date.now()
    ) {
      return {
        batchNumber: EARoundsNeedingBatchMinting[0].roundNumber,
        isExecutedBefore: false,
      };
    }
    if (EARoundsNeedingBatchMinting[0].roundNumber === 1) {
      throw new Error('There is no finished round!');
    }
    return {
      batchNumber: EARoundsNeedingBatchMinting[0].roundNumber - 1,
      isExecutedBefore: true,
    };
  }

  // If all EA rounds have batch minting executed, move to QF rounds
  const allQfRounds = (await findQfRounds({})).sort((a, b) => {
    return new Date(a.beginDate).getTime() - new Date(b.beginDate).getTime();
  });
  const QFRoundsNeedingBatchMinting = allQfRounds.filter(round => {
    return !round.isBatchMintingExecuted;
  });

  const datasource = AppDataSource.getDataSource();
  const earlyAccessRoundRepository = datasource.getRepository(EarlyAccessRound);
  const lastEarlyAccessRound = await earlyAccessRoundRepository
    .createQueryBuilder('eaRound')
    .orderBy('eaRound.roundNumber', 'DESC')
    .getOne();
  const lastEarlyAccessRoundNumber = lastEarlyAccessRound
    ? lastEarlyAccessRound.roundNumber
    : 0;

  if (QFRoundsNeedingBatchMinting.length > 0) {
    if (
      new Date(QFRoundsNeedingBatchMinting[0].endDate).getTime() < Date.now()
    ) {
      return {
        batchNumber:
          lastEarlyAccessRoundNumber +
          (QFRoundsNeedingBatchMinting[0].roundNumber || 0),
        isExecutedBefore: false,
      };
    }
    return {
      batchNumber: lastEarlyAccessRoundNumber,
      isExecutedBefore: true,
    };
  }

  // if batch minting are executed for all rounds, return last qf round
  return {
    batchNumber:
      lastEarlyAccessRoundNumber + (allQfRounds[-1].roundNumber || 0),
    isExecutedBefore: true,
  };
}

async function setBatchMintingExecutionFlag(
  seasonNumber: number,
  batchNumber: number,
) {
  const round = await getRoundBySeasonNumberAndBatchNumber(
    seasonNumber,
    batchNumber,
  );
  round.isBatchMintingExecuted = true;
  await round.save();
}

async function main() {
  try {
    // Step 0
    console.info('Get season number from args...');
    const seasonNumber = Number(process.argv[2]);
    console.info('Season number is:', seasonNumber);

    // Step 1
    console.info('Get project id from args...');
    const projectId = Number(process.argv[3]);
    console.info('Project id is:', projectId);

    // Step 2
    console.info('Get batch number from args or calculating it...');
    const batchNumber =
      Number(process.argv[4]) ||
      (await getFirstRoundThatNeedExecuteBatchMinting()).batchNumber;
    console.info('Batch number is:', batchNumber);

    const dryRun = (process.argv[5] ?? '').toLowerCase() === 'true';
    console.info('Dry run is:', dryRun);

    const isLastProject = (process.argv[6] ?? '').toLowerCase() === 'true';
    console.info('Is last project is:', isLastProject);

    // Step 3
    console.info('Start pulling latest version of funding pot service...');
    await pullLatestVersionOfFundingPot();
    console.info('Funding pot service updates successfully.');

    // Step 4
    console.info('Installing dependencies of funding pot service...');
    await installDependencies();
    console.info('Dependencies installed.');

    // Step 5
    console.info('Filling input data in to the funding pot service...');
    const projectName = await fillInputData(
      seasonNumber,
      projectId,
      batchNumber,
      dryRun,
    );
    console.info('Input data filled successfully.');

    // Step 6
    console.info('Creating .env file for funding pot service...');
    await createEnvFile();
    console.info('Env file created successfully.');

    // Step 7
    console.info('Restoring previous report files...');
    await restoreReportsFromDB(reportFilesDir);
    console.info('Previous report files restored successfully!');

    // Step 8
    console.info('Running funding pot service...');
    await runFundingPotService(seasonNumber, projectName, batchNumber, dryRun);
    console.info('Funding pot service executed successfully!');

    // Step 9
    if (!dryRun) {
      if (!isLastProject) {
        console.info('Setting batch minting execution flag in round data...');
        await setBatchMintingExecutionFlag(seasonNumber, batchNumber);
        console.info('Batch minting execution flag set successfully.');
      }

      // Step 10
      console.info('Start Syncing reward data in donations...');
      await updateRewardsForDonationsOfProject(
        seasonNumber,
        batchNumber,
        projectId,
      );
      console.info('Rewards data synced successfully.');
    }
    console.info('Done!');
    process.exit();
  } catch (error) {
    console.error('Error in running funding pot service.', error.message);
    process.exit();
  }
}

main();
