import { Repository } from 'typeorm';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import {
  InverterAdapter,
  StreamingPaymentProcessorResponse,
  Vesting,
} from '../adapters/inverter/inverterAdapter';
import { logger } from '../utils/logger';
import { AppDataSource } from '../orm';
import { getProvider, QACC_NETWORK_ID } from '../provider';

const adapter = new InverterAdapter();

async function updateTokenPriceAndTotalSupplyForProjects(
  projectRepository: Repository<Project>,
) {
  const allProjects = await projectRepository.find();
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
      project.abc.tokenPrice = await fetchTokenPrice(project);
      project.abc.totalSupply = await fetchTokenTotalSupply(project);
      await project.save();
      logger.debug(
        `token price and total supply of project ${project.id} updated successfully`,
      );
    } catch (error) {
      logger.error(
        `Error in update token price and total supply of project ${project.id}`,
        error,
      );
    }
  }
}

async function fetchTokenPrice(project: Project) {
  try {
    const tokenPrice = await adapter.getTokenPrice(
      getProvider(QACC_NETWORK_ID),
      project.abc.orchestratorAddress, // todo: check the contract address to be orchestrator address or not
    );
    logger.debug(`Fetched token price for project ${project.id}:`, tokenPrice);
    return parseFloat(tokenPrice);
  } catch (error) {
    logger.error(`Error in fetch token price of project ${project.id}`, error);
    return null;
  }
}

async function fetchTokenTotalSupply(project: Project) {
  try {
    const tokenTotalSupply = await adapter.getTokenTotalSupplyByAddress(
      project.abc.orchestratorAddress,
    );
    logger.debug(
      `Fetched total supply for project ${project.title}:`,
      tokenTotalSupply,
    );
    return parseFloat(tokenTotalSupply);
  } catch (error) {
    logger.error(
      `Error fetching total supply for project ${project.id}:`,
      error,
    );
    return null;
  }
}

async function updateRewardsForDonations(
  donationRepository: Repository<Donation>,
) {
  try {
    const donations = await donationRepository.find({
      where: [
        { rewardStreamEnd: undefined },
        { rewardStreamStart: undefined },
        { rewardTokenAmount: undefined },
      ],
    });

    const donationsByProjectId = donations.reduce(
      (acc, donation) => {
        const projectId = donation.projectId;
        if (!acc[projectId]) {
          acc[projectId] = [];
        }
        acc[projectId].push(donation);
        return acc;
      },
      {} as Record<number, Donation[]>,
    );

    for (const projectId of Object.keys(donationsByProjectId)) {
      logger.debug(
        `Start fetching reward data for project ${projectId} donations`,
      );
      await fillRewardDataOfProjectDonations(donationsByProjectId[projectId]);
      logger.debug(`Reward data filled for project ${projectId} donations`);
    }
  } catch (error) {
    logger.error(`Error updating rewards for donations`, error);
  }
}

async function fillRewardDataOfProjectDonations(donations: Donation[]) {
  const project = donations[0].project;
  if (!project.abc) {
    logger.error(
      `fill reward data of project donations failed. project ${project.id} don't have abc object!`,
    );
    return;
  }
  if (!project.abc.orchestratorAddress) {
    logger.error(
      `fill reward data of project donations failed. can not find orchestratorAddress for project ${project.id}!`,
    );
    return;
  }
  try {
    logger.debug(
      `start fetching reward info from inverter for project ${project.id}`,
    );
    const rewardInfo: StreamingPaymentProcessorResponse =
      await adapter.getProjectRewardInfo(project.abc.orchestratorAddress);
    logger.debug(`reward info for project ${project.id} fetched.`);
    const rewards: Vesting[] = rewardInfo[0].vestings;
    for (const donation of donations) {
      const filteredRewards = rewards.filter(
        reward => reward.recipient === donation.fromWalletAddress,
      );
      if (filteredRewards.length === 0) {
        logger.error(`no reward data exist for donation ${donation.id}!`);
        continue;
      }
      if (!donation.blockNumber) {
        logger.error(
          `donation blockNumber not exist for donation ${donation.id}!`,
        );
        continue;
      }
      logger.debug(
        `start getting block timestamp for block number: ${donation.blockNumber}, from network with Id: ${QACC_NETWORK_ID}`,
      );
      const donationBlockTimestamp = await adapter.getBlockTimestamp(
        getProvider(QACC_NETWORK_ID),
        donation.blockNumber,
      );
      logger.debug(
        `the block timestamp for block number: ${donation.blockNumber} is: ${donationBlockTimestamp}`,
      );
      const donationRewardInfo = filteredRewards.find(
        reward => reward.blockTimestamp === donationBlockTimestamp,
      );
      if (!donationRewardInfo) {
        logger.error(
          `donation blockTimestamp for donation ${donation.id} did not match any reward data blockTimes!
          donationBlockTimestamp = ${donationBlockTimestamp}`,
        );
        continue;
      }
      logger.debug(`donation reward data for donation: ${donation.id}, is: 
      ${donationRewardInfo.start}, ${donationRewardInfo.end}, ${donationRewardInfo.cliff}, ${donationRewardInfo.amountRaw}`);

      donation.rewardStreamStart = new Date(parseInt(donationRewardInfo.start));
      donation.rewardStreamEnd = new Date(parseInt(donationRewardInfo.end));
      donation.rewardTokenAmount = parseFloat(donationRewardInfo.amountRaw);
      donation.cliff = parseFloat(donationRewardInfo.cliff);

      await donation.save();
      logger.debug(
        `reward data of donation ${donation.id} filled successfully.`,
      );
    }
  } catch (error) {
    logger.error(`fill reward data of project donations failed!`, error);
    return;
  }
}

async function syncDonationsWithBlockchainData() {
  logger.debug('bootstrap() before AppDataSource.initialize()', new Date());
  await AppDataSource.initialize();
  logger.debug('bootstrap() after AppDataSource.initialize()', new Date());

  const datasource = AppDataSource.getDataSource();
  const donationRepository = datasource.getRepository(Donation);
  const projectRepository = datasource.getRepository(Project);

  await updateTokenPriceAndTotalSupplyForProjects(projectRepository);

  await updateRewardsForDonations(donationRepository);
}

syncDonationsWithBlockchainData()
  .then(() => {
    logger.info('Data synced successfully.');
    process.exit();
  })
  .catch(error => {
    logger.error('Error syncing data:', error);
    process.abort();
  });
