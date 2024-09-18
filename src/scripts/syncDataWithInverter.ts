/* eslint-disable no-console */
import _ from 'lodash';
import { ethers } from 'ethers';
import { FindOptionsWhere } from 'typeorm';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import {
  InverterAdapter,
  StreamingPaymentProcessorResponse,
  Vesting,
} from '../adapters/inverter/inverterAdapter';
import { AppDataSource } from '../orm';
import { getProvider, QACC_NETWORK_ID } from '../provider';

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

async function updateRewardsForDonations(
  donationFilter: FindOptionsWhere<Donation>,
) {
  try {
    const datasource = AppDataSource.getDataSource();
    const donationRepository = datasource.getRepository(Donation);
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
      console.debug(
        `Start fetching reward data for project ${projectId} donations`,
      );
      await fillRewardDataOfProjectDonations(donationsByProjectId[projectId]);
      console.debug(`Reward data filled for project ${projectId} donations`);
    }
  } catch (error) {
    console.error(`Error updating rewards for donations`, error);
  }
}

async function fillRewardDataOfProjectDonations(donations: Donation[]) {
  const project = donations[0].project;
  if (!project.abc) {
    console.error(
      `fill reward data of project donations failed. project ${project.id} don't have abc object!`,
    );
    return;
  }
  if (!project.abc.orchestratorAddress) {
    console.error(
      `fill reward data of project donations failed. can not find orchestratorAddress for project ${project.id}!`,
    );
    return;
  }
  try {
    console.debug(
      `start fetching reward info from inverter for project ${project.id}`,
    );
    const rewardInfo: StreamingPaymentProcessorResponse =
      await adapter.getProjectRewardInfo(project.abc.orchestratorAddress);
    console.debug(`reward info for project ${project.id} fetched.`);
    const rewards: Vesting[] = rewardInfo[0]?.vestings || [];
    for (const donation of donations) {
      const filteredRewards = rewards.filter(
        reward => reward.recipient === donation.fromWalletAddress,
      );
      if (filteredRewards.length === 0) {
        console.error(`no reward data exist for donation ${donation.id}!`);
        continue;
      }
      if (!donation.blockNumber) {
        console.error(
          `donation blockNumber not exist for donation ${donation.id}!`,
        );
        continue;
      }
      console.debug(
        `start getting block timestamp for block number: ${donation.blockNumber}, from network with Id: ${QACC_NETWORK_ID}`,
      );
      const donationBlockTimestamp = await adapter.getBlockTimestamp(
        donation.blockNumber,
      );
      console.debug(
        `the block timestamp for block number: ${donation.blockNumber} is: ${donationBlockTimestamp}`,
      );
      const donationRewardInfo = filteredRewards.filter(
        reward => reward.blockTimestamp === donationBlockTimestamp,
      );
      if (donationRewardInfo.length === 0) {
        console.error(
          `donation blockTimestamp for donation ${donation.id} did not match any reward data blockTimes!
          donationBlockTimestamp = ${donationBlockTimestamp}`,
        );
        continue;
      }
      let reward = donationRewardInfo[0];
      if (donationRewardInfo.length > 1) {
        console.debug(
          `find more that one reward info for user ${donation.userId} in one block!`,
        );
        const userDonationsInThisBlock = donations.filter(
          d =>
            d.fromWalletAddress === donation.fromWalletAddress &&
            d.blockNumber === donation.blockNumber,
        );
        if (userDonationsInThisBlock.length !== donationRewardInfo.length) {
          console.error(
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
      console.debug(`donation reward data for donation: ${donation.id}, is: 
      ${reward.start}, ${reward.end}, ${reward.cliff}, ${reward.amountRaw}`);

      donation.rewardStreamStart = new Date(parseInt(reward.start));
      donation.rewardStreamEnd = new Date(parseInt(reward.end));
      donation.rewardTokenAmount = parseFloat(
        ethers.utils.formatUnits(reward.amountRaw, 18),
      ); // Assuming the reward amount is returned in 18 decimals
      donation.cliff = parseFloat(reward.cliff);

      await donation.save();
      console.debug(
        `reward data of donation ${donation.id} filled successfully.`,
      );
    }
  } catch (error) {
    console.error(`fill reward data of project donations failed!`, error);
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
