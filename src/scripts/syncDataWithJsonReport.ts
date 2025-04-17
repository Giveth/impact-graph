/* eslint-disable no-console */
import path from 'path';
import { ethers } from 'ethers';
import fs from 'fs-extra';
import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import { AppDataSource } from '../orm';
import { getStreamDetails } from './helpers';
import { reportFilesDir } from './configs';

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
  donations: Donation[],
  reportData: any,
  seasonNumber: number,
) {
  try {
    const participants = reportData.batch.data.participants;
    const lowerCasedParticipants = Object.keys(participants).reduce(
      (acc, key) => {
        acc[key.toLowerCase()] = participants[key];
        return acc;
      },
      {},
    );

    for (const donation of donations) {
      try {
        const participantData =
          lowerCasedParticipants[donation.fromWalletAddress.toLowerCase()];

        if (!participantData) {
          console.error(
            `No participant data found for donation ${donation.id}`,
          );
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
            parseFloat(
              ethers.utils.formatUnits(donationValidContribution, 18),
            ) /
            parseFloat(ethers.utils.formatUnits(totalValidContribution, 18));

          // Calculate the reward proportionally based on the valid contribution
          rewardAmount = issuanceAllocation * contributionPercentage;
        }
        donation.rewardTokenAmount = rewardAmount || 0;

        const vestingInfo = getStreamDetails(donation.project, seasonNumber);

        donation.cliff = vestingInfo.CLIFF * 1000;
        donation.rewardStreamStart = new Date(vestingInfo.START * 1000);
        donation.rewardStreamEnd = new Date(vestingInfo.END * 1000);

        await donation.save();
        console.debug(
          `Reward data for donation ${donation.id} successfully updated`,
        );
      } catch (e) {
        console.error(
          `Failed to process donations rewards for project ${donations[0].projectId} and donation ${donation.id}: ${e.message}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `Failed to process donations rewards for project ${donations[0].projectId}: ${error.message}`,
    );
  }
}

export async function updateRewardsForDonationsOfProject(
  seasonNumber: number,
  batchNumber: number,
  projectId: number,
) {
  try {
    const datasource = AppDataSource.getDataSource();
    const donationRepository = datasource.getRepository(Donation);
    const donations = await donationRepository.find({
      where: {
        projectId,
        rewardStreamEnd: undefined,
        rewardStreamStart: undefined,
        rewardTokenAmount: undefined,
      },
    });

    const allReportFiles = getAllReportFiles(reportFilesDir);

    console.debug(`Start processing project ${projectId} for donations.`);

    const project = await Project.findOne({
      where: { id: Number(projectId) },
    });
    if (!project || !project.abc?.orchestratorAddress) {
      console.error(
        `Project or orchestratorAddress not found for project ${projectId}!`,
      );
      return;
    }

    // Look for matching report files based on orchestrator address
    let matchedReportFile = null;
    for (const reportFilePath of allReportFiles) {
      const fileName = path.basename(reportFilePath);

      if (fileName.endsWith(`${batchNumber}.json`)) {
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
        `No matching report found for project with orchestrator address ${project.abc.orchestratorAddress}, for batch number ${batchNumber}`,
      );
      return;
    }

    await updateNumberOfBatchMintingTransactionsForProject(
      project,
      matchedReportFile,
      seasonNumber,
      batchNumber,
    );

    await processReportForDonations(donations, matchedReportFile, seasonNumber);
  } catch (error) {
    console.error(`Error updating rewards for donations`, error);
  }
}

async function updateNumberOfBatchMintingTransactionsForProject(
  project: Project,
  reportData: any,
  seasonNumber: number,
  batchNumber: number,
) {
  const transactions = reportData.safe.proposedTransactions;
  const numberToSave = seasonNumber * 100 + batchNumber; // example: 101 for season 1, batch 1
  if (transactions.length > 0) {
    if (!project.batchNumbersWithSafeTransactions) {
      project.batchNumbersWithSafeTransactions = [numberToSave];
    } else if (
      !project.batchNumbersWithSafeTransactions.includes(numberToSave)
    ) {
      project.batchNumbersWithSafeTransactions.push(numberToSave);
    } else {
      return;
    }
    await project.save();
  }
}
