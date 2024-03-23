import { getSuperFluidAdapter } from '../adapters/adaptersFactory';
import { DONATION_STATUS, Donation } from '../entities/donation';
import {
  RECURRING_DONATION_STATUS,
  RecurringDonation,
} from '../entities/recurringDonation';
import { Token } from '../entities/token';
import { NETWORK_IDS, superTokensToToken } from '../provider';
import { findProjectRecipientAddressByNetworkId } from '../repositories/projectAddressRepository';
import { findProjectById } from '../repositories/projectRepository';
import { findRecurringDonationById } from '../repositories/recurringDonationRepository';
import { findUserById } from '../repositories/userRepository';
import { ChainType } from '../types/network';
import { i18n, translationErrorMessagesKeys } from '../utils/errorMessages';
import { logger } from '../utils/logger';
import { isTestEnv } from '../utils/utils';
import {
  isTokenAcceptableForProject,
  updateTotalDonationsOfProject,
} from './donationService';
import { calculateGivbackFactor } from './givbackService';
import { relatedActiveQfRoundForProject } from './qfRoundService';
import { updateUserTotalDonated, updateUserTotalReceived } from './userService';

// Initially it will only be monthly data
const priceDisplay = 'month';

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
    currency: recurringDonation.currency,
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
      const networkId = isTestEnv
        ? NETWORK_IDS.OPTIMISTIC
        : NETWORK_IDS.OPTIMISM_SEPOLIA; // CHANGE TO SEPOLIA
      const tokenInDb = await Token.findOne({
        where: {
          networkId,
          symbol: superTokensToToken[recurringDonation.currency],
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
        valueUsd: Math.abs(Number(streamData.amountFiat)),
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
  // TODO Should implement it
  return (await findRecurringDonationById(
    params.donationId,
  )) as RecurringDonation;
};
