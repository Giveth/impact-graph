import _ from 'lodash';
import { ethers } from 'ethers';
import { FindOptionsWhere, DataSource } from 'typeorm';
import config from '../config';
import { getEntities } from '../entities/entities';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import {
  InverterAdapter,
  StreamingPaymentProcessorResponse,
  Vesting,
} from '../adapters/inverter/inverterAdapter';
import { logger } from '../utils/logger';
import { getProvider, QACC_NETWORK_ID } from '../provider';

export class StandaloneDataSource {
  private static datasource: DataSource;

  static async initialize() {
    if (!StandaloneDataSource.datasource) {
      StandaloneDataSource.datasource = new DataSource({
        type: 'postgres',
        database: config.get('TYPEORM_DATABASE_NAME') as string,
        username: config.get('TYPEORM_DATABASE_USER') as string,
        password: config.get('TYPEORM_DATABASE_PASSWORD') as string,
        port: config.get('TYPEORM_DATABASE_PORT') as number,
        host: config.get('TYPEORM_DATABASE_HOST') as string,
        entities: getEntities(),
        synchronize: false,
        dropSchema: false,
        logging: ['error'],
        extra: {
          maxWaitingClients: 10,
          evictionRunIntervalMillis: 500,
          idleTimeoutMillis: 500,
        },
      });

      await StandaloneDataSource.datasource.initialize();
    }
  }

  static getDataSource() {
    return StandaloneDataSource.datasource;
  }
}

const adapter = new InverterAdapter(getProvider(QACC_NETWORK_ID));

async function updateTokenPriceAndTotalSupplyForProjects(
  projectFilter: FindOptionsWhere<Project>,
) {
  const dataSource = StandaloneDataSource.getDataSource();
  const projectRepository = dataSource.getRepository(Project);
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

async function updateRewardsForDonations(
  donationFilter: FindOptionsWhere<Donation>,
) {
  try {
    const dataSource = StandaloneDataSource.getDataSource();
    const donationRepository = dataSource.getRepository(Donation);
    const donations = await donationRepository.find({
      where: [
        { rewardStreamEnd: undefined },
        { rewardStreamStart: undefined },
        { rewardTokenAmount: undefined },
        donationFilter,
      ],
    });

    const donationsByProjectId = _.groupBy(donations, 'projectId');

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
        donation.blockNumber,
      );
      logger.debug(
        `the block timestamp for block number: ${donation.blockNumber} is: ${donationBlockTimestamp}`,
      );
      const donationRewardInfo = filteredRewards.filter(
        reward => reward.blockTimestamp === donationBlockTimestamp,
      );
      if (donationRewardInfo.length === 0) {
        logger.error(
          `donation blockTimestamp for donation ${donation.id} did not match any reward data blockTimes!
          donationBlockTimestamp = ${donationBlockTimestamp}`,
        );
        continue;
      }
      let reward = donationRewardInfo[0];
      if (donationRewardInfo.length > 1) {
        logger.debug(
          `find more that one reward info for user ${donation.userId} in one block!`,
        );
        const userDonationsInThisBlock = donations.filter(
          d =>
            d.fromWalletAddress === donation.fromWalletAddress &&
            d.blockNumber === donation.blockNumber,
        );
        if (userDonationsInThisBlock.length !== donationRewardInfo.length) {
          logger.error(
            `the number of user donations in the ${donation.blockNumber} block is ${userDonationsInThisBlock.length}
             but we have ${donationRewardInfo.length} reward info for it!`,
          );
          continue;
        }
        const sortedDonations = userDonationsInThisBlock.sort(
          (a, b) => a.amount - b.amount,
        );
        const sortedRewardInfo = donationRewardInfo.sort(
          (a, b) => parseFloat(a.amountRaw) - parseFloat(b.amountRaw),
        );
        const currentDonationIndex = sortedDonations.findIndex(
          d => d.id === donation.id,
        );
        reward = sortedRewardInfo[currentDonationIndex];
      }
      logger.debug(`donation reward data for donation: ${donation.id}, is: 
      ${reward.start}, ${reward.end}, ${reward.cliff}, ${reward.amountRaw}`);

      donation.rewardStreamStart = new Date(parseInt(reward.start));
      donation.rewardStreamEnd = new Date(parseInt(reward.end));
      donation.rewardTokenAmount = parseFloat(
        ethers.utils.formatUnits(reward.amountRaw, 18),
      ); // Assuming the reward amount is returned in 18 decimals
      donation.cliff = parseFloat(reward.cliff);

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
  logger.debug('before StandaloneDataSource.initialize()', new Date());
  await StandaloneDataSource.initialize();
  logger.debug('after StandaloneDataSource.initialize(', new Date());

  await updateTokenPriceAndTotalSupplyForProjects(projectFilter);

  await updateRewardsForDonations(donationFilter);
}
