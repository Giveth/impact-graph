import { getTokenPrices } from '@giveth/monoswap';
import { Project } from '../entities/project';
import { Token } from '../entities/token';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { TransakOrder } from './transak/order';
import { logger } from '../utils/logger';
import {
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { findProjectById } from '../repositories/projectRepository';
import { convertExponentialNumber } from '../utils/utils';
import { fetchGivHistoricPrice } from './givPriceService';
import {
  findDonationById,
  findStableCoinDonationsWithoutPrice,
} from '../repositories/donationRepository';
import {
  getChainvineAdapter,
  getNotificationAdapter,
} from '../adapters/adaptersFactory';
import { calculateGivbackFactor } from './givbackService';
import SentryLogger from '../sentryLogger';
import {
  getUserDonationStats,
  updateUserTotalDonated,
  updateUserTotalReceived,
} from './userService';
import { refreshProjectEstimatedMatchingView } from './projectViewsService';
import { AppDataSource } from '../orm';
import { getQfRoundHistoriesThatDontHaveRelatedDonations } from '../repositories/qfRoundHistoryRepository';
import { getPowerRound } from '../repositories/powerRoundRepository';
import { fetchSafeTransactionHash } from './safeServices';
import { NETWORKS_IDS_TO_NAME } from '../provider';
import { getTransactionInfoFromNetwork } from './chains';
import { getEvmTransactionTimestamp } from './chains/evm/transactionService';
import { getOrttoPersonAttributes } from '../adapters/notifications/NotificationCenterAdapter';
import { CustomToken, getTokenPrice } from './priceService';
import { updateProjectStatistics } from './projectService';

export const TRANSAK_COMPLETED_STATUS = 'COMPLETED';

export const updateDonationPricesAndValues = async (
  donation: Donation,
  project: Project,
  token: CustomToken,
  priceChainId: number,
) => {
  logger.debug('updateDonationPricesAndValues() has been called', {
    donationId: donation.id,
    projectId: project.id,
    token: token?.symbol,
    priceChainId,
  });
  try {
    const tokenPrice = await getTokenPrice(priceChainId, token);
    donation.priceUsd = toFixNumber(tokenPrice, 4);
    donation.valueUsd = toFixNumber(donation.amount * tokenPrice, 4);
  } catch (e) {
    logger.error('Error in getting price from donation', {
      error: e,
      donation,
    });

    await getNotificationAdapter().donationGetPriceFailed({
      project,
      donationInfo: {
        reason: 'Getting price failed',

        // TODO Add txLink
        txLink: donation.transactionId,
      },
    });
    SentryLogger.captureException(
      new Error('Error in getting price from monoswap'),
      {
        extra: {
          donationId: donation.id,
          txHash: donation.transactionId,
          currency: donation.currency,
          network: donation.transactionNetworkId,
        },
      },
    );
  }
  logger.debug('updateDonationPricesAndValues() result', {
    valueUsd: donation.valueUsd,
    donationId: donation.id,
    projectId: project.id,
    token: token?.symbol,
    priceChainId,
  });
  const { givbackFactor, projectRank, bottomRankInRound, powerRound } =
    await calculateGivbackFactor(project.id);
  donation.givbackFactor = givbackFactor;
  donation.projectRank = projectRank;
  donation.bottomRankInRound = bottomRankInRound;
  donation.powerRound = powerRound;

  return await donation.save();
};

export const getMonoSwapTokenPrices = async (
  token: string,
  baseTokens: string[],
  chainId: number,
): Promise<number[]> => {
  try {
    const tokenPrices = await getTokenPrices(token, baseTokens, chainId);

    return tokenPrices;
  } catch (e) {
    logger.debug('Unable to fetch monoswap prices: ', e);
    return [];
  }
};

export const updateDonationByTransakData = async (
  transakData: TransakOrder,
) => {
  const donation = await Donation.findOne({
    where: {
      transactionId: transakData.webhookData.id,
    },
  });
  if (!donation) throw new Error('Donation not found.');
  let donationProjectIsValid = true;
  donation.transakStatus = transakData.webhookData.status;
  donation.currency = transakData.webhookData.cryptocurrency;
  donation.fromWalletAddress = transakData.webhookData.fromWalletAddress;
  if (donation.amount !== transakData.webhookData.cryptoAmount) {
    // If the transaction amount is different with donation amount
    // it proves it's might be fraud, so we change the valueEth and valueUsd
    donation.valueUsd =
      donation.valueUsd *
      (transakData.webhookData.cryptoAmount / donation.amount);
    donation.valueEth =
      donation.valueEth *
      (transakData.webhookData.cryptoAmount / donation.amount);
    donation.amount = transakData.webhookData.cryptoAmount;
  }

  if (
    donation.toWalletAddress.toLowerCase() !==
    transakData.webhookData.walletAddress.toLowerCase()
  ) {
    // we should check the walletAddress is matched with what is in donation, ir prevents fraud
    donation.toWalletAddress = transakData.webhookData.walletAddress;
    const project = await Project.findOne({
      where: {
        walletAddress: transakData.webhookData.walletAddress,
      },
    });
    if (project) {
      donation.projectId = project.id || 0;
    } else {
      donationProjectIsValid = false;
    }
  }

  if (TRANSAK_COMPLETED_STATUS === donation.transakStatus) {
    await sendNotificationForDonation({
      donation,
    });
    if (donationProjectIsValid) {
      donation.status = DONATION_STATUS.VERIFIED;
      donation.transakTransactionLink = transakData.webhookData.transactionLink;
    }
  }
  await donation.save();
  await updateTotalDonationsOfProject(donation.projectId);

  // We dont wait for this to finish
  refreshProjectEstimatedMatchingView();
};

export const updateTotalDonationsOfProject = async (
  projectId: number,
): Promise<void> => {
  try {
    await Project.query(
      `
      UPDATE "project"
      SET "totalDonations" = (
        (
          SELECT COALESCE(SUM(d."valueUsd"),0)
          FROM "donation" as d
          WHERE d."projectId" = $1 AND d."status" = 'verified'
        )
      )
      WHERE "id" = $1
    `,
      [projectId],
    );
  } catch (e) {
    logger.error('updateTotalDonationsOfAProject error', e);
  }
};

export const isTokenAcceptableForProject = async (inputData: {
  projectId: number;
  tokenId: number;
}): Promise<boolean> => {
  try {
    const { projectId, tokenId } = inputData;
    const tokenCount = await Token.createQueryBuilder('token')
      .where('token.id = :tokenId', { tokenId })
      .innerJoinAndSelect('token.organizations', 'organization')
      .innerJoinAndSelect(
        'organization.projects',
        'project',
        'project.id = :projectId',
        { projectId },
      )
      .getCount();
    return tokenCount > 0;
  } catch (e) {
    logger.error('isProjectAcceptToken() error', {
      inputData,
      error: e,
    });
    return false;
  }
};

export const toFixNumber = (input: number, digits: number): number => {
  return convertExponentialNumber(Number(input.toFixed(digits)));
};

export const updateOldGivDonationsPrice = async () => {
  const donations = await Donation.findXdaiGivDonationsWithoutPrice();
  logger.debug('updateOldGivDonationPrice donations count', donations.length);
  for (const donation of donations) {
    logger.debug(
      'updateOldGivDonationPrice() updating accurate price, donationId',
      donation.id,
    );
    try {
      const givHistoricPrices = await fetchGivHistoricPrice(
        donation.transactionId,
        donation.transactionNetworkId,
      );
      logger.debug('Update donation usd price ', {
        donationId: donation.id,
        ...givHistoricPrices,
        valueEth: toFixNumber(
          donation.amount * givHistoricPrices.givPriceInEth,
          7,
        ),
      });
      donation.priceEth = toFixNumber(givHistoricPrices.ethPriceInUsd, 7);
      donation.priceUsd = toFixNumber(givHistoricPrices.givPriceInUsd, 4);
      donation.valueUsd = toFixNumber(
        donation.amount * givHistoricPrices.givPriceInUsd,
        4,
      );
      donation.valueEth = toFixNumber(
        donation.amount * givHistoricPrices.givPriceInEth,
        7,
      );
      await donation.save();
      await updateTotalDonationsOfProject(donation.projectId);
    } catch (e) {
      logger.error('Update GIV donation valueUsd error', e.message);
    }
  }
};

export const updateOldStableCoinDonationsPrice = async () => {
  const donations = await findStableCoinDonationsWithoutPrice();
  logger.debug(
    'updateOldStableCoinDonationPrice donations count',
    donations.length,
  );
  for (const donation of donations) {
    logger.debug(
      'updateOldStableCoinDonationPrice() updating accurate price, donationId',
      donation.id,
    );
    try {
      donation.priceUsd = 1;
      donation.valueUsd = donation.amount;
      await donation.save();
      await updateTotalDonationsOfProject(donation.projectId);
    } catch (e) {
      logger.error('Update GIV donation valueUsd error', e.message);
    }
  }
};

const failedVerifiedDonationErrorMessages = [
  errorMessages.TRANSACTION_SMART_CONTRACT_CONFLICTS_WITH_CURRENCY,
  errorMessages.INVALID_NETWORK_ID,
  errorMessages.TRANSACTION_FROM_ADDRESS_IS_DIFFERENT_FROM_SENT_FROM_ADDRESS,
  errorMessages.TRANSACTION_TO_ADDRESS_IS_DIFFERENT_FROM_SENT_TO_ADDRESS,
  errorMessages.TRANSACTION_CANT_BE_OLDER_THAN_DONATION,
  errorMessages.TRANSACTION_STATUS_IS_FAILED_IN_NETWORK,
  errorMessages.TRANSACTION_NOT_FOUND_AND_NONCE_IS_USED,
];

export const syncDonationStatusWithBlockchainNetwork = async (params: {
  donationId: number;
}): Promise<Donation> => {
  const { donationId } = params;
  const donation = await findDonationById(donationId);
  if (!donation) {
    throw new Error(i18n.__(translationErrorMessagesKeys.DONATION_NOT_FOUND));
  }

  // fetch the transactionId from the safeTransaction Approval
  if (!donation.transactionId && donation.safeTransactionId) {
    const safeTransactionHash = await fetchSafeTransactionHash(
      donation.safeTransactionId,
      donation.transactionNetworkId,
    );
    if (safeTransactionHash) {
      donation.transactionId = safeTransactionHash;
      await donation.save();
    } else {
      // Donation is not ready in the multisig
      throw new Error(i18n.__(translationErrorMessagesKeys.DONATION_NOT_FOUND));
    }
  }

  logger.debug('syncDonationStatusWithBlockchainNetwork() has been called', {
    donationId,
    fetchDonationId: donation.id,
    txHash: donation.transactionId,
  });
  try {
    const transaction = await getTransactionInfoFromNetwork({
      nonce: donation.nonce,
      networkId: donation.transactionNetworkId,
      toAddress: donation.toWalletAddress,
      fromAddress: donation.fromWalletAddress,
      amount: donation.amount,
      symbol: donation.currency,
      txHash: donation.transactionId,
      chainType: donation.chainType,
      safeTxHash: donation.safeTransactionId,
      timestamp: donation.createdAt.getTime() / 1000,
    });
    donation.status = DONATION_STATUS.VERIFIED;
    if (transaction.hash !== donation.transactionId) {
      donation.speedup = true;
      donation.transactionId = transaction.hash;
    }
    await donation.save();

    // ONLY verified donations should be accumulated
    // After updating, recalculate user total donated and owner total received
    await updateUserTotalDonated(donation.userId);

    // After updating price we update the totalDonations
    await updateTotalDonationsOfProject(donation.projectId);
    const project = await findProjectById(donation.projectId);
    await updateUserTotalReceived(project!.adminUser.id);
    await sendNotificationForDonation({
      donation,
    });

    // Update materialized view for project and qfRound data
    await insertDonationsFromQfRoundHistory();

    await updateProjectStatistics(donation.projectId);

    const donationStats = await getUserDonationStats(donation.userId);
    const donor = await findUserById(donation.userId);

    const orttoPerson = getOrttoPersonAttributes({
      userId: donation.userId.toString(),
      firstName: donor?.firstName,
      lastName: donor?.lastName,
      email: donor?.email,
      totalDonated: donationStats?.totalDonated,
      donationsCount: donationStats?.donationsCount,
      lastDonationDate: donationStats?.lastDonationDate,
      GIVbacksRound: donation.powerRound + 1, // powerRound is 1 behind givbacks round
      QFDonor: donation.qfRound?.name,
      donationChain: NETWORKS_IDS_TO_NAME[donation.transactionNetworkId],
    });
    await getNotificationAdapter().updateOrttoPeople([orttoPerson]);

    // send chainvine the referral as last step to not interrupt previous
    if (donation.referrerWallet && donation.isReferrerGivbackEligible) {
      logger.debug(
        'sending chainvine params: ',
        JSON.stringify({
          fromWalletAddress: donation.fromWalletAddress,
          amount: donation.amount,
          transactionId: donation.transactionId,
          tokenAddress: donation.tokenAddress,
          valueUsd: donation.priceUsd,
          donationId: donation.id,
        }),
      );
      await getChainvineAdapter().notifyChainVine({
        fromWalletAddress: donation.fromWalletAddress,
        amount: donation.amount,
        transactionId: donation.transactionId,
        tokenAddress: donation.tokenAddress,
        valueUsd: donation.priceUsd, // the USD value of the token at the time of the conversion
        donationId: donation.id, //
      });
      await refreshProjectEstimatedMatchingView();
    }

    logger.debug('donation and transaction', {
      transaction,
      donationId: donation.id,
    });
    return donation;
  } catch (e) {
    logger.error('syncDonationStatusWithBlockchainNetwork() error', {
      error: e,
      donationId: donation.id,
      txHash: donation.transactionId,
    });

    if (failedVerifiedDonationErrorMessages.includes(e.message)) {
      // if error message is in failedVerifiedDonationi18n.__(translationErrorMessagesKeys.then) we know we should change the status to failed
      // otherwise we leave it to be checked in next cycle
      donation.verifyErrorMessage = e.message;
      donation.status = DONATION_STATUS.FAILED;
      await donation.save();
    }
    return donation;
  }
};

export const sendNotificationForDonation = async (params: {
  donation: Donation;
}): Promise<void> => {
  const { donation } = params;
  if (donation.segmentNotified) {
    // Should not send notifications for those that we already sent
    return;
  }
  donation.segmentNotified = true;
  await donation.save();
  const project = await findProjectById(donation.projectId);
  if (!project) {
    logger.error(
      'sendEventForDonation project not found for sending segment event donationId',
      donation.id,
    );
    return;
  }
  const donorUser = await findUserById(donation.userId);
  const projectOwner = project.adminUser;
  const projectOwnerWithEmailAddress = await findUserById(project.adminUser.id);
  if (projectOwner) {
    await getNotificationAdapter().donationReceived({
      donation,
      project,
      user: projectOwnerWithEmailAddress,
    });
  }

  if (donorUser) {
    await getNotificationAdapter().donationSent({
      donation,
      project,
      donor: donorUser,
    });
  }
};

export const insertDonationsFromQfRoundHistory = async (): Promise<void> => {
  const qfRoundHistories =
    await getQfRoundHistoriesThatDontHaveRelatedDonations();
  const donationDotEthAddress = '0x6e8873085530406995170Da467010565968C7C62'; // Address behind donation.eth ENS address;
  const powerRound = (await getPowerRound())?.round || 1;
  if (qfRoundHistories.length === 0) {
    logger.debug(
      'insertDonationsFromQfRoundHistory There is not any qfRoundHistories in DB that doesnt have related donation',
    );
    return;
  }
  logger.debug(
    `insertDonationsFromQfRoundHistory Filling ${qfRoundHistories.length} qfRoundHistory info ...`,
  );

  for (const qfRoundHistory of qfRoundHistories) {
    if (qfRoundHistory.distributedFundTxDate) {
      continue;
    }
    // get transaction time from blockchain
    const txTimestamp = await getEvmTransactionTimestamp({
      txHash: qfRoundHistory.distributedFundTxHash,
      networkId: Number(qfRoundHistory.distributedFundNetwork),
    });
    qfRoundHistory.distributedFundTxDate = new Date(txTimestamp);
    await qfRoundHistory.save();
  }
  const matchingFundFromAddress =
    (process.env.MATCHING_FUND_DONATIONS_FROM_ADDRESS as string) ||
    donationDotEthAddress;
  const user = await findUserByWalletAddress(matchingFundFromAddress);
  if (!user) {
    logger.error(
      'insertDonationsFromQfRoundHistory User with walletAddress MATCHING_FUND_DONATIONS_FROM_ADDRESS doesnt exist',
    );
    return;
  }
  await AppDataSource.getDataSource().query(`
         INSERT INTO "donation" (
            "transactionId",
            "transactionNetworkId",
            "status",
            "toWalletAddress",
            "fromWalletAddress",
            "currency",
            "amount",
            "valueUsd",
            "priceUsd",
            "powerRound",
            "projectId",
            "distributedFundQfRoundId",
            "segmentNotified",
            "userId",
            "createdAt"
        )
        SELECT
            q."distributedFundTxHash",
            CAST(q."distributedFundNetwork" AS INTEGER),
            'verified',
            pa."address",
            u."walletAddress",
            q."matchingFundCurrency",
            q."matchingFundAmount",
            q."matchingFund",
            q."matchingFundPriceUsd",
            ${powerRound},
            q."projectId",
            q."qfRoundId",
            true,
            ${user.id},
            q."distributedFundTxDate"
        FROM
            "qf_round_history" q
            INNER JOIN "project" p ON q."projectId" = p."id"
            INNER JOIN "user" u ON u."id" = ${user.id}
            INNER JOIN "project_address" pa ON pa."projectId" = p."id" AND pa."networkId" = CAST(q."distributedFundNetwork" AS INTEGER)
        WHERE
            q."distributedFundTxHash" IS NOT NULL AND
            q."matchingFundAmount" IS NOT NULL AND
            q."matchingFundCurrency" IS NOT NULL AND
            q."distributedFundNetwork" IS NOT NULL AND
            q."matchingFund" IS NOT NULL AND
            q."matchingFund" != 0 AND
            NOT EXISTS (
              SELECT 1
              FROM "donation" d
              WHERE 
                  d."transactionId" = q."distributedFundTxHash" AND
                  d."projectId" = q."projectId" AND
                  d."distributedFundQfRoundId" = q."qfRoundId"
            )
  `);

  for (const qfRoundHistory of qfRoundHistories) {
    await updateTotalDonationsOfProject(qfRoundHistory.projectId);
    const project = await findProjectById(qfRoundHistory.projectId);
    if (project) {
      await updateUserTotalReceived(project.adminUser.id);
    }
  }
  await updateUserTotalDonated(user.id);
};
