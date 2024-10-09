/* eslint-disable no-console */
import { FindOptionsWhere } from 'typeorm';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import { InverterAdapter } from '../adapters/inverter/inverterAdapter';
import { AppDataSource } from '../orm';
import { getProvider, QACC_NETWORK_ID } from '../provider';
import { updateRewardsForDonations } from './syncDataWithJsonReport';

const adapter = new InverterAdapter(getProvider(QACC_NETWORK_ID));

async function updateTokenPriceAndTotalSupplyForProjects(
  projectFilter: FindOptionsWhere<Project>,
) {
  const datasource = AppDataSource.getDataSource();
  const projectRepository = datasource.getRepository(Project);
  const allProjects = await projectRepository.find({ where: projectFilter });
  for (const project of allProjects) {
    if (!project.abc) {
      console.error(
        `sync project token price failed. project ${project.id} don't have abc object!`,
      );
      continue;
    }
    if (!project.abc.orchestratorAddress) {
      console.error(
        `sync project token price failed. can not find orchestratorAddress for project ${project.id}!`,
      );
      continue;
    }
    try {
      console.debug(
        `start fetching token price and total supply of project ${project.id}`,
      );
      const price = await fetchTokenPrice(project);
      if (price) {
        project.abc.tokenPrice = price;
      }
      const totalSupply = await fetchTokenTotalSupply(project);
      if (totalSupply) {
        project.abc.totalSupply = totalSupply;
      }
      await project.save();
      console.debug(
        `token price and total supply of project ${project.id} saved successfully`,
      );
    } catch (error) {
      console.error(
        `Error in update token price and total supply of project ${project.id}`,
        error,
      );
    }
  }
}

async function fetchTokenPrice(project: Project) {
  try {
    console.debug(`start fetching token price for project ${project.id}:`);
    const tokenPrice = await adapter.getTokenPrice(
      project.abc.fundingManagerAddress,
    );
    console.debug(`Fetched token price for project ${project.id}:`, tokenPrice);
    return parseFloat(tokenPrice);
  } catch (error) {
    console.error(`Error in fetch token price of project ${project.id}`, error);
    return;
  }
}

async function fetchTokenTotalSupply(project: Project) {
  try {
    const tokenTotalSupply = await adapter.getTokenTotalSupplyByAddress(
      project.abc.orchestratorAddress,
    );
    console.debug(
      `Fetched total supply for project ${project.id}:`,
      tokenTotalSupply,
    );
    return parseFloat(tokenTotalSupply);
  } catch (error) {
    console.error(
      `Error fetching total supply for project ${project.id}:`,
      error,
    );
    return;
  }
}

export async function syncDonationsWithBlockchainData(
  {
    projectFilter,
    donationFilter,
  }: {
    projectFilter: FindOptionsWhere<Project>;
    donationFilter: FindOptionsWhere<Donation>;
  } = {
    projectFilter: {},
    donationFilter: {},
  },
) {
  console.debug('bootstrap() before AppDataSource.initialize()', new Date());
  await AppDataSource.initialize(false);
  console.debug('bootstrap() after AppDataSource.initialize()', new Date());

  await updateTokenPriceAndTotalSupplyForProjects(projectFilter);

  await updateRewardsForDonations(donationFilter);
}
