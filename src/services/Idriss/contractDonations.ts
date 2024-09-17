import { ethers } from 'ethers';
import moment from 'moment';
import axios from 'axios';
import { isTransactionHashStored } from '../../repositories/donationRepository';
import { DONATION_ORIGINS, Donation } from '../../entities/donation';
import { findProjectByWalletAddressAndNetwork } from '../../repositories/projectRepository';
import { NETWORK_IDS } from '../../provider';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { ProjStatus } from '../../entities/project';
import { Token } from '../../entities/token';
import {
  getMonoSwapTokenPrices,
  isTokenAcceptableForProject,
} from '../donationService';
import { findProjectRecipientAddressByNetworkId } from '../../repositories/projectAddressRepository';
import { relatedActiveQfRoundForProject } from '../qfRoundService';
import {
  createUserWithPublicAddress,
  findUserByWalletAddress,
} from '../../repositories/userRepository';
import { logger } from '../../utils/logger';
import { getGitcoinAdapter } from '../../adapters/adaptersFactory';
import { calculateGivbackFactor } from '../givbackService';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../userService';
import { updateProjectStatistics } from '../projectService';

// contract address
const IDRISS_SUBSQUID_SUBGRAPH_URL =
  'https://squid.subsquid.io/giveth-idriss-squid/v/v1/graphql';
const IDRISS_SUBSQUID_QUERY = `
  query MyQuery {
    contractEventTipMessages(limit: 1000, where: {blockNumber_gt: 110356996, message_not_eq: ""}) {
      id
      blockNumber
      blockTimestamp
      message
      transactionHash
      contract
      recipientAddress
      sender
      tokenAddress
    }
  }
`;

export interface IdrissDonation {
  from: string;
  recipient: string;
  amount: number;
  chain: string;
  token: string;
  txHash: string;
  blockNumber?: number;
  blockTimestamp?: string;
}

export const getTwitterDonations = async () => {
  // Add all Giveth recipient addresses in lowercase for recipient filter
  // ['0x5abca791c22e7f99237fcc04639e094ffa0ccce9']; example
  const relevantRecipients = String(
    process.env.QF_ROUND_PROJECTS_ADDRESSES || '',
  )
    .split(',')
    .map(recipient => recipient.toLowerCase());

  if (relevantRecipients.length <= 1 && relevantRecipients[0] === '') {
    return;
  }

  const result = await axios.post(IDRISS_SUBSQUID_SUBGRAPH_URL, {
    query: IDRISS_SUBSQUID_QUERY,
  });

  const tippingEvents = result?.data?.data?.contractEventTipMessages;

  if (!tippingEvents) return;

  for (const event of tippingEvents) {
    if (!(await isTransactionHashStored(event.transactionHash))) {
      try {
        // Check if recipient is a relevant Giveth recipient
        if (relevantRecipients.includes(event.recipientAddress.toLowerCase())) {
          logger.debug(
            'Creating Donation from Idriss' +
              event.recipientAddress.toLowerCase(),
          );
          await createIdrissTwitterDonation({
            from: event.sender.toLowerCase(),
            recipient: event.recipientAddress.toLowerCase(),
            amount: parseFloat(ethers.utils.formatEther(event.message)),
            chain: 'optimism',
            token:
              event.tokenAddress ??
              '0x0000000000000000000000000000000000000000',
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            blockTimestamp: event.blockTimestamp,
          });
        }
      } catch (e) {
        logger.error('error creating twitter donation', e);
      }
    }
  }
};

export const createIdrissTwitterDonation = async (
  idrissDonation: IdrissDonation,
) => {
  try {
    const priceChainId = NETWORK_IDS.OPTIMISTIC;
    const project = await findProjectByWalletAddressAndNetwork(
      idrissDonation.recipient,
      priceChainId,
    );

    if (!project) {
      throw new Error(i18n.__(translationErrorMessagesKeys.PROJECT_NOT_FOUND));
    }

    if (project.status.id !== ProjStatus.active) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.JUST_ACTIVE_PROJECTS_ACCEPT_DONATION,
        ),
      );
    }

    const tokenSymbol =
      idrissDonation.token === '0x0000000000000000000000000000000000000000'
        ? 'ETH'
        : 'OP';
    const tokenInDb = await Token.findOne({
      where: {
        networkId: priceChainId,
        symbol: tokenSymbol,
      },
    });
    // Token givback Eligibility
    let isTokenEligibleForGivback = false;
    if (tokenInDb) {
      const acceptsToken = await isTokenAcceptableForProject({
        projectId: project.id,
        tokenId: tokenInDb.id,
      });
      if (!acceptsToken && !project.organization.supportCustomTokens) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.PROJECT_DOES_NOT_SUPPORT_THIS_TOKEN,
          ),
        );
      }
      isTokenEligibleForGivback = tokenInDb.isGivbackEligible;
    }

    // ProjectRelatedAddress
    const projectRelatedAddress = await findProjectRecipientAddressByNetworkId({
      projectId: project.id,
      networkId: priceChainId,
    });
    if (!projectRelatedAddress) {
      throw new Error(
        i18n.__(
          translationErrorMessagesKeys.THERE_IS_NO_RECIPIENT_ADDRESS_FOR_THIS_NETWORK_ID_AND_PROJECT,
        ),
      );
    }

    // Donation Creation and User fetch or create.
    const toAddress = idrissDonation.recipient.toLowerCase() as string;
    const fromAddress = idrissDonation.from.toLowerCase() as string;

    let donorUser = await findUserByWalletAddress(fromAddress);

    if (!donorUser) {
      donorUser = await createUserWithPublicAddress(fromAddress);

      try {
        const passportScore = await getGitcoinAdapter().submitPassport({
          address: donorUser!.walletAddress!,
        });
        const passportStamps = await getGitcoinAdapter().getPassportStamps(
          donorUser!.walletAddress!,
        );

        if (passportScore && passportScore?.score) {
          const score = Number(passportScore.score);
          donorUser.passportScore = score;
        }
        if (passportStamps)
          donorUser.passportStamps = passportStamps.items.length;
        await donorUser.save();
      } catch (e) {
        logger.error(
          `refreshUserScores Error with address ${donorUser.walletAddress}: `,
          e,
        );
      }
    }

    const donation = Donation.create({
      amount: Number(idrissDonation.amount),
      transactionId: idrissDonation?.txHash?.toLowerCase(),
      isFiat: false,
      transactionNetworkId: Number(priceChainId),
      currency: tokenSymbol,
      user: donorUser,
      tokenAddress: idrissDonation.token,
      project,
      status: 'verified',
      blockNumber: idrissDonation.blockNumber,
      origin: DONATION_ORIGINS.IDRISS_TWITTER,
      isTokenEligibleForGivback,
      isCustomToken: false,
      isProjectGivbackEligible: project.isGivbackEligible,
      createdAt: moment(idrissDonation.blockTimestamp).toDate(),
      segmentNotified: false,
      isExternal: true,
      toWalletAddress: toAddress.toString().toLowerCase(),
      fromWalletAddress: fromAddress.toString().toLowerCase(),
      anonymous: false,
    });

    // set QFround
    const activeQfRoundForProject = await relatedActiveQfRoundForProject(
      project.id,
    );
    if (
      activeQfRoundForProject &&
      activeQfRoundForProject.isEligibleNetwork(Number(priceChainId))
    ) {
      donation.qfRound = activeQfRoundForProject;
    }
    await donation.save();

    const baseTokens: string[] = ['USDT', 'ETH'];

    // get prices
    const tokenPrices = await getMonoSwapTokenPrices(
      tokenSymbol,
      baseTokens,
      Number(priceChainId),
    );

    if (tokenPrices.length !== 0) {
      donation.priceUsd = Number(tokenPrices[0]);
      donation.priceEth = Number(tokenPrices[1]);

      donation.valueUsd = Number(idrissDonation.amount) * donation.priceUsd;
      donation.valueEth = Number(idrissDonation.amount) * donation.priceEth;
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
    await updateProjectStatistics(donation.projectId);
    await updateUserTotalReceived(
      project?.adminUserId || project?.adminUser?.id,
    );
  } catch (e) {
    logger.error('createIdrissTwitterDonation() error', e);
  }
};
