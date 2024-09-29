/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { ethers } from 'ethers';
import { FindOptionsWhere } from 'typeorm';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import { AppDataSource } from '../orm';
import {
  InverterAdapter,
  StreamingPaymentProcessorResponse,
} from '../adapters/inverter/inverterAdapter';
import { getProvider, QACC_NETWORK_ID } from '../provider';

const adapter = new InverterAdapter(getProvider(QACC_NETWORK_ID));

async function loadReportFile(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error reading report file: ${error.message}`);
    return null;
  }
}

function getAllReportFiles(dirPath: string) {
  let files: string[] = [];

  fs.readdirSync(dirPath).forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      files = files.concat(getAllReportFiles(fullPath)); // Recursively get files from subdirectories
    } else if (fullPath.endsWith('.json')) {
      files.push(fullPath);
    }
  });

  return files;
}

async function processReportForDonations(
  projectOrchestratorAddress: string,
  donations: Donation[],
  reportData: any,
) {
  try {
    const rewardInfo: StreamingPaymentProcessorResponse =
      await adapter.getProjectRewardInfo(projectOrchestratorAddress);
    const participants = reportData.batch.participants;
    const lowerCasedParticipants = Object.keys(participants).reduce(
      (acc, key) => {
        acc[key.toLowerCase()] = participants[key];
        return acc;
      },
      {},
    );

    for (const donation of donations) {
      const participantData =
        lowerCasedParticipants[donation.fromWalletAddress.toLowerCase()];

      if (!participantData) {
        console.error(`No participant data found for donation ${donation.id}`);
        continue;
      }

      const totalValidContribution = ethers.BigNumber.from(
        participantData.validContribution,
      );
      const issuanceAllocation = ethers.BigNumber.from(
        participantData.issuanceAllocation,
      );

      const donationTransaction = participantData.transactions.find(
        (tx: any) =>
          tx.txHash.toLowerCase() === donation.transactionId.toLowerCase(),
      );

      if (!donationTransaction) {
        console.error(`No transaction data found for donation ${donation.id}`);
        continue;
      }

      const donationValidContribution = ethers.BigNumber.from(
        donationTransaction.validContribution,
      );
      const contributionPercentage = donationValidContribution.div(
        totalValidContribution,
      );

      // Calculate the reward proportionally based on the valid contribution
      const rewardAmount = issuanceAllocation.mul(contributionPercentage);
      donation.rewardTokenAmount = parseFloat(
        ethers.utils.formatUnits(rewardAmount, 18),
      ); // Assuming 18 decimal places

      // Fetch the cliff, reward start, and end dates from the InverterAdapter
      const vestingInfo = rewardInfo[0]?.vestings.find(
        v => v.recipient === donation.fromWalletAddress,
      );

      if (vestingInfo) {
        // Calculate cliff proportionally in the same way as rewardAmount
        const totalCliff = parseFloat(vestingInfo.cliff);
        donation.cliff = totalCliff * contributionPercentage.toNumber();
        donation.rewardStreamStart = new Date(parseInt(vestingInfo.start));
        donation.rewardStreamEnd = new Date(parseInt(vestingInfo.end));
        if (String(vestingInfo.amountRaw) !== String(issuanceAllocation)) {
          console.warn(`The reward amount and issuance allocation for project ${donation.projectId} is not match!\n
          the reward raw amount is: ${vestingInfo.amountRaw} and the issuance allocation in report is: ${issuanceAllocation}`);
        }
      } else {
        console.error(
          `No vesting information found for donation ${donation.id}`,
        );
      }

      await donation.save();
      console.debug(
        `Reward data for donation ${donation.id} successfully updated`,
      );
    }
  } catch (error) {
    console.error(
      `Failed to process donations rewards for project ${donations[0].projectId}: ${error.message}`,
    );
  }
}

export async function updateRewardsForDonations(
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
    const allReportFiles = getAllReportFiles(
      path.join(__dirname, '/reportFiles/output'),
    );

    for (const projectId of Object.keys(donationsByProjectId)) {
      console.debug(`Start processing project ${projectId} for donations.`);

      const project = await Project.findOne({
        where: { id: Number(projectId) },
      });
      if (!project || !project.abc?.orchestratorAddress) {
        console.error(
          `Project or orchestratorAddress not found for project ${projectId}!`,
        );
        continue;
      }

      // Look for matching report files based on orchestrator address
      let matchedReportFile = null;
      for (const reportFilePath of allReportFiles) {
        const reportData = await loadReportFile(reportFilePath);
        if (!reportData) continue;

        const reportOrchestratorAddress =
          reportData.queries?.addresses?.orchestrator?.toLowerCase();
        if (
          reportOrchestratorAddress ===
          project.abc.orchestratorAddress.toLowerCase()
        ) {
          matchedReportFile = reportData;
          break;
        }
      }

      if (!matchedReportFile) {
        console.error(
          `No matching report found for project with orchestrator address ${project.abc.orchestratorAddress}`,
        );
        continue;
      }

      await processReportForDonations(
        project.abc.orchestratorAddress,
        donationsByProjectId[projectId],
        matchedReportFile,
      );
    }
  } catch (error) {
    console.error(`Error updating rewards for donations`, error);
  }
}
