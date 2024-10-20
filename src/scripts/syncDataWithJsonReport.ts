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
    const participants = reportData.batch.data.participants;
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
        participantData.validContribution.inCollateral,
      );
      // if issuance allocation is not exist, that mean this user has not any valid contributions
      let rewardAmount = 0;
      if (participantData.issuanceAllocation) {
        const issuanceAllocationRow = ethers.BigNumber.from(
          participantData.issuanceAllocation,
        );
        const issuanceAllocation = parseFloat(
          ethers.utils.formatUnits(issuanceAllocationRow, 18),
        ); // Assuming 18 decimal places

        const donationTransaction = participantData.transactions.find(
          (tx: any) =>
            tx.transactionHash.toLowerCase() ===
            donation.transactionId.toLowerCase(),
        );

        if (!donationTransaction) {
          console.error(
            `No transaction data found for donation ${donation.id}`,
          );
          continue;
        }

        const donationValidContribution = ethers.BigNumber.from(
          donationTransaction.validContribution,
        );
        const contributionPercentage =
          parseFloat(ethers.utils.formatUnits(donationValidContribution, 18)) /
          parseFloat(ethers.utils.formatUnits(totalValidContribution, 18));

        // Calculate the reward proportionally based on the valid contribution
        rewardAmount = issuanceAllocation * contributionPercentage;
      }
      donation.rewardTokenAmount = rewardAmount || 0;

      // Fetch the cliff, reward start, and end dates from the InverterAdapter
      const vestingInfo = rewardInfo[0]?.vestings.find(
        v =>
          v.recipient.toLowerCase() ===
          donation.fromWalletAddress.toLowerCase(),
      );

      if (vestingInfo) {
        donation.cliff = parseFloat(vestingInfo.cliff);
        donation.rewardStreamStart = new Date(
          parseInt(vestingInfo.start) * 1000,
        );
        donation.rewardStreamEnd = new Date(parseInt(vestingInfo.end) * 1000);
        if (
          String(vestingInfo.amountRaw) !== '0' &&
          String(vestingInfo.amountRaw) !==
            String(participantData.issuanceAllocation)
        ) {
          console.warn(`The reward amount and issuance allocation for project ${donation.projectId} is not match!\n
          the reward raw amount is: ${vestingInfo.amountRaw} and the issuance allocation in report is: ${participantData.issuanceAllocation}`);
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

// function getRoundNumberByDonations(donations: Donation[]): number {
//   // todo: we need to find round number in a better way, because maybe there left some donations from previous rounds
//   if (!donations.length) {
//     return 0; // Return 0 if there are no donations
//   }
//
//   const firstDonation = donations[0]; // Assuming all donations belong to the same round
//
//   // Check if the project is in an Early Access Round or QF Round
//   if (firstDonation.earlyAccessRound) {
//     return firstDonation.earlyAccessRound.roundNumber; // Return the round number directly for Early Access
//   } else if (firstDonation.qfRound.roundNumber) {
//     return firstDonation.qfRound.roundNumber + 4; // Add 4 to the round number for QF Rounds
//   } else {
//     console.error(
//       `No round information found for donation ${firstDonation.id}`,
//     );
//     return 0; // Return 0 if no round information is found
//   }
// }

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

      // const roundNumber = getRoundNumberByDonations(
      //   donationsByProjectId[projectId],
      // );
      const roundNumber = Number(process.argv[2]);

      // Look for matching report files based on orchestrator address
      let matchedReportFile = null;
      for (const reportFilePath of allReportFiles) {
        const fileName = path.basename(reportFilePath);

        if (fileName.endsWith(`${roundNumber}.json`)) {
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
      }

      if (!matchedReportFile) {
        console.error(
          `No matching report found for project with orchestrator address ${project.abc.orchestratorAddress}, for round number ${roundNumber}`,
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
