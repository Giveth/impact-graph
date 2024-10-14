/* eslint-disable no-console */
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { repoLocalDir, repoUrl } from './configs';
import config from '../config';
import { Project } from '../entities/project';
import { AppDataSource } from '../orm';

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

// Helper function to convert a string to SCREAMING_SNAKE_CASE
function toScreamingSnakeCase(str: string): string {
  return str
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[a-z]/g, letter => letter.toUpperCase()) // Convert lowercase letters to uppercase
    .replace(/[^A-Z0-9_]/g, ''); // Remove non-alphanumeric characters except underscores
}

async function fillProjectsData() {
  console.info('Initialize the data source (database connection)...');
  await AppDataSource.initialize(false);
  console.info('Data source initialized.');
  const datasource = AppDataSource.getDataSource();
  const projectRepository = datasource.getRepository(Project);

  const allProjects = await projectRepository.find();

  // Prepare the projects data in the required format
  const projectsData = {};
  allProjects.forEach(project => {
    // Check if project has the required fields (orchestratorAddress, projectAddress, NFT)
    if (project.abc) {
      const screamingSnakeCaseTitle = toScreamingSnakeCase(project.title);
      projectsData[screamingSnakeCaseTitle] = {
        SAFE: project.abc.projectAddress || '',
        ORCHESTRATOR: project.abc.orchestratorAddress || '',
        NFT: project.abc.nftContractAddress || '',
      };
    } else {
      console.warn(
        `Project ${project.id} does not have abc object. Skipping...`,
      );
    }
  });

  // Define the path to the projects.json file inside funding pot repo
  const filePath = path.join(
    repoLocalDir,
    'data',
    'production',
    'input',
    'projects.json',
  );

  // Ensure the directory exists
  await fs.ensureDir(path.dirname(filePath));

  // Write the projects data to the projects.json file
  await fs.writeJson(filePath, projectsData, { spaces: 2 });

  console.info(`Projects data successfully written to ${filePath}`);
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

    exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        return reject(error);
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return reject(new Error(stderr));
      }

      console.log(`stdout: ${stdout}`);
      resolve();
    });
  });
}

const serviceDir = path.join(repoLocalDir);

async function installDependencies() {
  console.info(`Installing npm dependencies in ${serviceDir}...`);
  await execShellCommand('npm install', serviceDir);
}

async function runFundingPotService() {
  const command = 'npm run all ' + Number(process.argv[2]);
  console.info(`Running "${command}" in ${serviceDir}...`);
  await execShellCommand(command, serviceDir);
}

async function main() {
  try {
    // Step 1
    console.info('Start pulling latest version of funding pot service...');
    await pullLatestVersionOfFundingPot();
    console.info('Funding pot service updates successfully.');

    // Step 2
    console.info('Installing dependencies of funding pot service...');
    await installDependencies();
    console.info('Dependencies installed.');

    // Step 3
    console.info('Filling projects data in to the funding pot service...');
    await fillProjectsData();
    console.info('Projects data filled successfully.');

    // Step 4
    console.info('Creating .env file for funding pot service...');
    await createEnvFile();
    console.info('Env file created successfully.');

    // Step 5
    console.info('Running funding pot service...');
    await runFundingPotService();
    console.info('Done!');
    process.exit();
  } catch (error) {
    console.error('Error in running funding pot service.', error.message);
    process.exit();
  }
}

main();
