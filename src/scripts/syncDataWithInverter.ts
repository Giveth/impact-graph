import { FindOptionsWhere } from 'typeorm';
import { Project } from '../entities/project';
import { InverterAdapter } from '../adapters/inverter/inverterAdapter';
import { AppDataSource } from '../orm';
import { getProvider, QACC_NETWORK_ID } from '../provider';
import { logger } from '../utils/logger';

const adapter = new InverterAdapter(getProvider(QACC_NETWORK_ID));

async function fetchTokenPrice(project: Project) {
  try {
    logger.debug(`start fetching token price for project ${project.id}:`);
    const tokenPrice = await adapter.getTokenPrice(
      project.abc.fundingManagerAddress,
    );
    logger.debug(`Fetched token price for project ${project.id}:`, tokenPrice);
    return parseFloat(tokenPrice);
  } catch (error) {
    logger.error(`Error in fetch token price of project ${project.id}`, error);
    return;
  }
}

async function fetchTokenTotalSupply(project: Project) {
  try {
    const tokenTotalSupply = await adapter.getTokenTotalSupplyByAddress(
      project.abc.orchestratorAddress,
    );
    logger.debug(
      `Fetched total supply for project ${project.id}:`,
      tokenTotalSupply,
    );
    return parseFloat(tokenTotalSupply);
  } catch (error) {
    logger.error(
      `Error fetching total supply for project ${project.id}:`,
      error,
    );
    return;
  }
}

export async function syncDonationsWithIndexerData(
  {
    projectFilter,
  }: {
    projectFilter: FindOptionsWhere<Project>;
  } = {
    projectFilter: {},
  },
) {
  const datasource = AppDataSource.getDataSource();
  const projectRepository = datasource.getRepository(Project);
  const allProjects = await projectRepository.find({ where: projectFilter });
  for (const project of allProjects) {
    if (!project.abc) {
      logger.error(
        `sync project token price failed. project ${project.id} don't have abc object!`,
      );
      continue;
    }
    if (!project.abc.orchestratorAddress) {
      logger.error(
        `sync project token price failed. can not find orchestratorAddress for project ${project.id}!`,
      );
      continue;
    }
    try {
      logger.debug(
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
      logger.debug(
        `token price and total supply of project ${project.id} saved successfully`,
      );
    } catch (error) {
      logger.error(
        `Error in update token price and total supply of project ${project.id}`,
        error,
      );
    }
  }
}
