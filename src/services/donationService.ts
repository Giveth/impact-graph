import { Project } from '../entities/project';
import { Token } from '../entities/token';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { TransakOrder } from './transak/order';
import { User } from '../entities/user';
import DonationTracker from './segment/DonationTracker';
import { SegmentEvents } from '../analytics/analytics';
import { logger } from '../utils/logger';
import { Organization } from '../entities/organization';
import { findUserById } from '../repositories/userRepository';
import { errorMessages } from '../utils/errorMessages';
import { getTransactionInfoFromNetwork } from './transactionService';
import { findProjectById } from '../repositories/projectRepository';
import { convertExponentialNumber } from '../utils/utils';
import { fetchGivHistoricPrice } from './givPriceService';

export const TRANSAK_COMPLETED_STATUS = 'COMPLETED';

export const updateDonationByTransakData = async (
  transakData: TransakOrder,
) => {
  const donation = await Donation.findOne({
    transactionId: transakData.webhookData.id,
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
      walletAddress: transakData.webhookData.walletAddress,
    });
    if (project) {
      donation.projectId = project.id || 0;
    } else {
      donationProjectIsValid = false;
    }
  }

  if (TRANSAK_COMPLETED_STATUS === donation.transakStatus) {
    await sendSegmentEventForDonation({
      donation,
    });
    if (donationProjectIsValid) {
      donation.status = DONATION_STATUS.VERIFIED;
      donation.transakTransactionLink = transakData.webhookData.transactionLink;
    }
  }
  await donation.save();
  await updateTotalDonationsOfProject(donation.projectId);
};

export const updateTotalDonationsOfProject = async (projectId: number) => {
  try {
    const donationsAmount = await Donation.query(
      `SELECT COALESCE(SUM("valueUsd"),0) AS total
            FROM donation
            WHERE "projectId" = ${projectId}`,
    );
    await Project.update(
      { id: projectId },
      {
        totalDonations: donationsAmount[0].total,
      },
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

const toFixNumber = (input: number, digits: number): number => {
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
          6,
        ),
      });
      donation.priceEth = toFixNumber(givHistoricPrices.ethPriceInUsd, 6);
      donation.priceUsd = toFixNumber(givHistoricPrices.givPriceInUsd, 3);
      donation.valueUsd = toFixNumber(
        donation.amount * givHistoricPrices.givPriceInUsd,
        3,
      );
      donation.valueEth = toFixNumber(
        donation.amount * givHistoricPrices.givPriceInEth,
        6,
      );
      await donation.save();
      await updateTotalDonationsOfProject(donation.projectId);
    } catch (e) {
      logger.error('Update GIV donation valueUsd error', e.message);
    }
  }
};

export const updateOldStableCoinDonationsPrice = async () => {
  const donations = await Donation.findStableCoinDonationsWithoutPrice();
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
];

export const syncDonationStatusWithBlockchainNetwork = async (params: {
  donationId: number;
}): Promise<Donation> => {
  const { donationId } = params;
  const donation = await Donation.findOne(donationId);
  if (!donation) {
    throw new Error(errorMessages.DONATION_NOT_FOUND);
  }
  try {
    if (
      donation.toWalletAddress.toLowerCase() !==
      donation.project.walletAddress?.toLowerCase()
    ) {
      donation.verifyErrorMessage =
        errorMessages.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS;
      donation.status = DONATION_STATUS.FAILED;
      await donation.save();
      return donation;
    }
    const transaction = await getTransactionInfoFromNetwork({
      nonce: donation.nonce,
      networkId: donation.transactionNetworkId,
      toAddress: donation.toWalletAddress,
      fromAddress: donation.fromWalletAddress,
      amount: donation.amount,
      symbol: donation.currency,
      txHash: donation.transactionId,
      timestamp: donation.createdAt.getTime() / 1000,
    });
    donation.status = DONATION_STATUS.VERIFIED;
    if (transaction.hash !== donation.transactionId) {
      donation.speedup = true;
      donation.transactionId = transaction.hash;
    }
    await donation.save();
    await sendSegmentEventForDonation({
      donation,
    });
    logger.debug('donation and transaction', {
      transaction,
      donationId: donation.id,
    });
    return donation;
  } catch (e) {
    logger.debug('checkPendingDonations() error', {
      error: e,
      donationId: donation.id,
    });

    if (failedVerifiedDonationErrorMessages.includes(e.message)) {
      // if error message is in failedVerifiedDonationErrorMessages then we know we should change the status to failed
      // otherwise we leave it to be checked in next cycle
      donation.verifyErrorMessage = e.message;
      donation.status = DONATION_STATUS.FAILED;
      await donation.save();
    }
    return donation;
  }
};

export const sendSegmentEventForDonation = async (params: {
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
      'sendSegmentEventForDonation project not found for sending segment event donationId',
      donation.id,
    );
    return;
  }
  const donorUser = await findUserById(donation.userId);
  const projectOwner = await findUserById(Number(project.admin));
  if (projectOwner) {
    new DonationTracker(
      donation,
      project,
      projectOwner,
      SegmentEvents.DONATION_RECEIVED,
    ).track();
  }

  if (donorUser) {
    new DonationTracker(
      donation,
      project,
      donorUser,
      SegmentEvents.MADE_DONATION,
    ).track();
  }
};
