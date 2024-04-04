import path from 'path';
import { promises as fs } from 'fs';
import { ethers } from 'ethers';
import {
  getNotificationAdapter,
  getSuperFluidAdapter,
} from '../adapters/adaptersFactory';
import { DONATION_STATUS, Donation } from '../entities/donation';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../entities/recurringDonation';
import { Token } from '../entities/token';
import { getProvider, NETWORK_IDS, superTokensToToken } from '../provider';
import { findProjectRecipientAddressByNetworkId } from '../repositories/projectAddressRepository';
import { findProjectById } from '../repositories/projectRepository';
import {
  findRecurringDonationById,
  updateRecurringDonationFromTheStreamDonations,
} from '../repositories/recurringDonationRepository';
import { findUserById } from '../repositories/userRepository';
import { ChainType } from '../types/network';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { logger } from '../utils/logger';
import {
  isTokenAcceptableForProject,
  updateDonationPricesAndValues,
  updateTotalDonationsOfProject,
} from './donationService';
import { calculateGivbackFactor } from './givbackService';
import { relatedActiveQfRoundForProject } from './qfRoundService';
import { updateUserTotalDonated, updateUserTotalReceived } from './userService';
import config from '../config';
import { User } from '../entities/user';

// Initially it will only be monthly data
export const priceDisplay = 'month';

export const fetchStreamTableStartDate = (
  recurringDonation: RecurringDonation,
): number => {
  if (recurringDonation.donations && recurringDonation.donations.length > 0) {
    const latestDonation = recurringDonation?.donations?.reduce(
      (prev, current) => {
        return prev.createdAt > current.createdAt ? prev : current;
      },
    );

    return Math.floor(latestDonation?.createdAt?.getTime() / 1000);
  }

  return Math.floor(recurringDonation.createdAt.getTime() / 1000);
};

export const createRelatedDonationsToStream = async (
  recurringDonation: RecurringDonation,
) => {
  const superFluidAdapter = getSuperFluidAdapter();
  const streamData = await superFluidAdapter.streamPeriods({
    address: recurringDonation.anchorContractAddress.address,
    chain: recurringDonation.networkId,
    start: fetchStreamTableStartDate(recurringDonation),
    end: Math.floor(new Date().getTime() / 1000),
    priceGranularity: priceDisplay,
    virtualization: priceDisplay,
    currency: 'USD',
    recurringDonationTxHash: recurringDonation.txHash,
  });

  if (
    streamData &&
    recurringDonation.status === RECURRING_DONATION_STATUS.PENDING
  ) {
    recurringDonation.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation.save();
  }

  if (streamData.stoppedAtTimestamp) {
    recurringDonation.finished = true;
    recurringDonation.status = RECURRING_DONATION_STATUS.ENDED;
    await recurringDonation.save();
  }

  const project = await findProjectById(recurringDonation.projectId);
  const donorUser = await findUserById(recurringDonation.donorId);

  if (!project) return;
  if (!donorUser) return;

  const uniquePeriods: any[] = [];

  for (const period of streamData.virtualPeriods) {
    const existingPeriod = await Donation.findOne({
      where: {
        recurringDonationId: recurringDonation.id,
        virtualPeriodStart: period.startTime,
        virtualPeriodEnd: period.endTime,
      },
    });

    if (!existingPeriod) {
      uniquePeriods.push({
        startTime: period.startTime,
        endTime: period.endTime,
        amount: period.amount,
        amountFiat: period.amountFiat,
      });
    }
  }
  // create donation if any virtual period is missing
  if (uniquePeriods.length === 0) return;

  for (const streamPeriod of uniquePeriods) {
    try {
      const environment = config.get('ENVIRONMENT') as string;

      const networkId =
        environment !== 'production'
          ? NETWORK_IDS.OPTIMISM_SEPOLIA
          : NETWORK_IDS.OPTIMISTIC;

      const symbolCurrency = recurringDonation.currency.includes('x')
        ? superTokensToToken[recurringDonation.currency]
        : recurringDonation.currency;
      const tokenInDb = await Token.findOne({
        where: {
          networkId,
          symbol: symbolCurrency,
        },
      });
      const isCustomToken = !tokenInDb;
      let isTokenEligibleForGivback = false;
      if (isCustomToken && !project!.organization.supportCustomTokens) {
        throw new Error(i18n.__(translationErrorMessagesKeys.TOKEN_NOT_FOUND));
      } else if (tokenInDb) {
        const acceptsToken = await isTokenAcceptableForProject({
          projectId: project!.id,
          tokenId: tokenInDb.id,
        });
        if (!acceptsToken && !project!.organization.supportCustomTokens) {
          throw new Error(
            i18n.__(
              translationErrorMessagesKeys.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
            ),
          );
        }
        isTokenEligibleForGivback = tokenInDb.isGivbackEligible;
      }
      const projectRelatedAddress =
        await findProjectRecipientAddressByNetworkId({
          projectId: project.id,
          networkId,
        });
      if (!projectRelatedAddress) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT,
          ),
        );
      }

      const toAddress = projectRelatedAddress?.address?.toLowerCase();
      const fromAddress = donorUser.walletAddress?.toLowerCase();
      const transactionTx = streamData.id?.toLowerCase() as string;

      const donation = Donation.create({
        amount: normalizeNegativeAmount(
          streamPeriod.amount,
          tokenInDb!.decimals,
        ),

        // prevent setting NaN value for valueUsd
        valueUsd: Math.abs(Number(streamPeriod.amountFiat)) || 0,
        transactionId: transactionTx,
        isFiat: false,
        transactionNetworkId: networkId,
        currency: tokenInDb?.symbol,
        user: donorUser,
        tokenAddress: tokenInDb?.address,
        project,
        status: DONATION_STATUS.VERIFIED,
        isTokenEligibleForGivback,
        isCustomToken,
        isProjectVerified: project.verified,
        createdAt: new Date(),
        segmentNotified: false,
        toWalletAddress: toAddress,
        fromWalletAddress: fromAddress,
        recurringDonation,
        anonymous: Boolean(recurringDonation.anonymous),
        chainType: ChainType.EVM,
        virtualPeriodStart: streamPeriod.startTime,
        virtualPeriodEnd: streamPeriod.endTime,
      });

      await donation.save();

      const activeQfRoundForProject = await relatedActiveQfRoundForProject(
        project.id,
      );

      if (
        activeQfRoundForProject &&
        activeQfRoundForProject.isEligibleNetwork(networkId)
      ) {
        donation.qfRound = activeQfRoundForProject;
      }

      const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
        await calculateGivbackFactor(project.id);
      donation.givbackFactor = givbackFactor;
      donation.projectRank = projectRank;
      donation.bottomRankInRound = bottomRankInRound;
      donation.powerRound = powerRound;

      await donation.save();

      if (!donation.valueUsd || donation.valueUsd === 0) {
        await updateDonationPricesAndValues(
          donation,
          project,
          tokenInDb!,
          donation.transactionNetworkId,
        );
      }

      await updateRecurringDonationFromTheStreamDonations(recurringDonation.id);

      await updateUserTotalDonated(donation.userId);

      // After updating price we update totalDonations
      await updateTotalDonationsOfProject(donation.projectId);
      await updateUserTotalReceived(project!.adminUser.id);
    } catch (e) {
      logger.error('createRelatedDonationsToStream() error', e);
    }
  }
};

export function normalizeNegativeAmount(
  amount: string,
  decimals: number,
): number {
  return Math.abs(Number(amount)) / 10 ** decimals;
}

export const updateRecurringDonationStatusWithNetwork = async (params: {
  donationId: number;
}): Promise<RecurringDonation> => {
  // TODO should refactor this function and make it smaller
  logger.debug(
    'updateRecurringDonationStatusWithNetwork() has been called',
    params,
  );
  const recurringDonation = await findRecurringDonationById(params.donationId);
  if (!recurringDonation) {
    throw new Error('Recurring donation not found');
  }
  try {
    const web3Provider = getProvider(recurringDonation!.networkId);
    const networkData = await web3Provider.getTransaction(
      recurringDonation!.txHash,
    );
    if (!networkData) {
      logger.debug(
        'Transaction not found in the network. maybe its not mined yet',
        {
          recurringDonationId: recurringDonation?.id,
          txHash: recurringDonation?.txHash,
        },
      );
      return recurringDonation.save();
    }
    let receiverLowercase = '';
    let flowRateBigNumber = '';

    if (!recurringDonation.isBatch) {
      const abiPath = path.join(__dirname, '../abi/superFluidAbi.json');
      const abi = JSON.parse(await fs.readFile(abiPath, 'utf-8'));
      const iface = new ethers.utils.Interface(abi);
      const decodedData = iface.parseTransaction({ data: networkData.data });
      receiverLowercase = decodedData.args[2].toLowerCase();
      flowRateBigNumber = decodedData.args[3];
    } else {
      // ABI comes from https://sepolia-optimism.etherscan.io/address/0x78743a68d52c9d6ccf3ff4558f3af510592e3c2d#code
      const abiPath = path.join(__dirname, '../abi/superFluidAbiBatch.json');
      const abi = JSON.parse(await fs.readFile(abiPath, 'utf-8'));
      const iface = new ethers.utils.Interface(abi);
      const decodedData = iface.parseTransaction({ data: networkData.data });

      for (const bachItem of decodedData.args[0]) {
        // console.log('opData', decodedData.args)
        const operationData = bachItem[2];
        const decodedOperationData = ethers.utils.defaultAbiCoder.decode(
          ['bytes', 'bytes'],
          operationData,
        );
        const abiPath2 = path.join(
          __dirname,
          '../abi/superFluidAbi_batch_decoded.json',
        );
        const decodedDataAbi = JSON.parse(await fs.readFile(abiPath2, 'utf-8'));
        const decodedDataIface = new ethers.utils.Interface(decodedDataAbi);
        const finalDecodedData = decodedDataIface.parseTransaction({
          data: decodedOperationData[0],
        });

        if (
          finalDecodedData.args[1].toLowerCase() ===
          recurringDonation?.anchorContractAddress?.address?.toLowerCase()
        ) {
          receiverLowercase = finalDecodedData.args[1].toLowerCase();
          flowRateBigNumber = finalDecodedData.args[2];
          continue;
        }
      }
    }

    if (
      recurringDonation?.anchorContractAddress?.address?.toLowerCase() !==
      receiverLowercase
    ) {
      recurringDonation.status = RECURRING_DONATION_STATUS.FAILED;
      recurringDonation.finished = true;
      return recurringDonation.save();
    }
    const flowRate = ethers.BigNumber.from(flowRateBigNumber).toString();
    if (recurringDonation?.flowRate !== flowRate) {
      logger.debug(
        'Recurring donation flowRate does not match the receiver address of the transaction data.',
        {
          recurringDonationId: recurringDonation?.id,
          donationFlowRate: recurringDonation?.flowRate,
          flowRate: flowRate,
          txHash: recurringDonation?.txHash,
        },
      );
      recurringDonation.status = RECURRING_DONATION_STATUS.FAILED;
      recurringDonation.finished = true;
      return recurringDonation.save();
    }
    recurringDonation.status = RECURRING_DONATION_STATUS.ACTIVE;
    await recurringDonation.save();
    const project = recurringDonation.project;
    const projectOwner = await User.findOneBy({ id: project.adminUserId });
    await getNotificationAdapter().donationReceived({
      project,
      user: projectOwner,
      donation: recurringDonation,
    });
    return recurringDonation;
  } catch (e) {
    logger.error('updateRecurringDonationStatusWithNetwork() error', {
      error: e,
      params,
    });
    return recurringDonation;
  }
};
