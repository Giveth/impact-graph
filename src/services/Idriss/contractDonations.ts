// import ethers..

import { ethers } from 'ethers';
import {
  getLatestBlockNumberFromDonations,
  isTransactionHashStored,
} from '../../repositories/donationRepository';
import { DONATION_EXTERNAL_SOURCES, Donation } from '../../entities/donation';
import {
  findProjectById,
  findProjectByWalletAddress,
  verifiedProjectsAddressesWithOptimism,
} from '../../repositories/projectRepository';
import { NETWORK_IDS } from '../../provider';
import { i18n, translationErrorMessagesKeys } from '../../utils/errorMessages';
import { ProjStatus } from '../../entities/project';
import { Token } from '../../entities/token';
import {
  isTokenAcceptableForProject,
  updateDonationPricesAndValues,
  updateTotalDonationsOfProject,
} from '../donationService';
import { findProjectRecipientAddressByNetworkId } from '../../repositories/projectAddressRepository';
import { relatedActiveQfRoundForProject } from '../qfRoundService';
import {
  createUserWithPublicAddress,
  findUserByWalletAddress,
} from '../../repositories/userRepository';
import { logger } from '../../utils/logger';
import { IDDRISS_TIPPING_CONTRACT_PARAMS } from './tippingContractParams';
import { getGitcoinAdapter } from '../../adapters/adaptersFactory';
import { sleep } from '../../utils/utils';
import moment from 'moment';
import {
  updateUserTotalDonated,
  updateUserTotalReceived,
} from '../userService';

// contract address
const IDDRISS_ADDRESS_CONTRACT = '0x43f532d678b6a1587be989a50526f89428f68315';

// Initialize with your RPC
const providerUrl = 'https://mainnet.optimism.io';
const ethersProvider = new ethers.providers.JsonRpcProvider(providerUrl);

const tippingContract = new ethers.Contract(
  IDDRISS_ADDRESS_CONTRACT,
  IDDRISS_TIPPING_CONTRACT_PARAMS,
  ethersProvider,
);

export interface IdrissDonation {
  from: string;
  recipient: string;
  amount: number;
  chain: string;
  token: string;
  txHash: string;
  // blockNumber: number;
}

export const getInputs = async (method, data) => {
  const parsedLog = await tippingContract.interface.parseTransaction({
    data,
  });
  if (method === '16e49145') {
    if (parsedLog) {
      const { args } = parsedLog;

      return {
        recipient_: args[0],
        amount_: args[1],
        tokenContractAddr_: '0x0000000000000000000000000000000000000000',
      };
    }
  } else {
    if (parsedLog) {
      const { args } = parsedLog;

      return {
        recipient_: args[0],
        amount_: args[1],
        tokenContractAddr_: args[2],
      };
    }
  }
  return null;
};

export const getTwitterDonations = async () => {
  const startingBlock = await getLatestBlockNumberFromDonations();

  // Add all Giveth recipient addresses in lowercase for recipient filter
  // ['0x5abca791c22e7f99237fcc04639e094ffa0ccce9']; example
  // const relevantRecipients = await verifiedProjectsAddressesWithOptimism();
  const relevantRecipients = String(
    process.env.QF_ROUND_PROJECTS_ADDRESSES || '',
  ).split(',');

  if (relevantRecipients.length <= 1 && relevantRecipients[0] === '') {
    return;
  }

  // Have to add a wait time or the function might throw error
  await sleep(100);
  const tippingEvents = await tippingContract.queryFilter(
    await tippingContract.filters.TipMessage(),
    startingBlock,
  );
  await sleep(100);

  for (const event of tippingEvents) {
    if (
      !(await isTransactionHashStored(
        event.transactionHash,
        DONATION_EXTERNAL_SOURCES.IDRISS_TWITTER,
      ))
    ) {
      try {
        const t = await ethersProvider.getTransaction(event.transactionHash);
        const method = t.data.slice(2, 10);
        const inputs = await getInputs(method, t.data);
        // Check if recipient is a relevant Giveth recipient
        if (relevantRecipients.includes(inputs!.recipient_.toLowerCase())) {
          logger.info('CreationDonation ' + inputs!.recipient_.toLowerCase());
          await createIdrissTwitterDonation({
            from: t.from,
            recipient: inputs!.recipient_,
            amount: parseFloat(ethers.utils.formatEther(inputs!.amount_)),
            chain: 'optimism',
            token:
              inputs!.tokenContractAddr_ ??
              '0x0000000000000000000000000000000000000000',
            txHash: event.transactionHash,
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
    const project = await findProjectByWalletAddress(idrissDonation.recipient);

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

    const donation = await Donation.create({
      amount: Number(idrissDonation.amount),
      transactionId: idrissDonation?.txHash?.toLowerCase(),
      isFiat: false,
      transactionNetworkId: Number(priceChainId),
      currency: tokenSymbol,
      user: donorUser,
      status: 'verified',
      tokenAddress: idrissDonation.token,
      project,
      isTokenEligibleForGivback,
      isCustomToken: false,
      isProjectVerified: project.verified,
      createdAt: moment().subtract(1, 'day').toDate(),
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

    await updateDonationPricesAndValues(
      donation,
      project,
      String(tokenSymbol),
      baseTokens,
      priceChainId,
      idrissDonation.amount,
    );

    await updateUserTotalDonated(donation.userId);

    // After updating price we update totalDonations
    await updateTotalDonationsOfProject(donation.projectId);
    await updateUserTotalReceived(project!.adminUser.id);
  } catch (e) {
    logger.error('createIdrissTwitterDonation() error', e);
  }
};
