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
    donation.segmentNotified = true;
    notifyTransakUpdate(donation);
    if (donationProjectIsValid) {
      donation.status = DONATION_STATUS.VERIFIED;
      donation.transakTransactionLink = transakData.webhookData.transactionLink;
    }
  }
  await donation.save();
  await updateTotalDonationsOfProject(donation.projectId);
};

const notifyTransakUpdate = async donation => {
  const project = await Project.findOne({ id: donation.projectId });
  const owner = await findUserById(Number(project?.admin));

  // Notify Owner of donation, and notify authenticated user his donation was received
  if (project && owner) {
    new DonationTracker(
      donation,
      project,
      owner,
      SegmentEvents.DONATION_RECEIVED,
    ).track();

    if (!donation.anonymous) {
      const donor = await findUserById(donation.userId);

      if (donor)
        new DonationTracker(
          donation,
          project,
          donor,
          SegmentEvents.MADE_DONATION,
        ).track();
    }
  }
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
