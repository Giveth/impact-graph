import { Project } from '../entities/project';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { TransakOrder } from './transak/order';
import { User } from '../entities/user';
import DonationTracker from './segment/DonationTracker';
import { SegmentEvents } from '../analytics/analytics';
import { logger } from '../utils/logger';
import { Organization } from '../entities/organization';

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
  const owner = await User.findOne({ id: Number(project?.admin) });

  // Notify Owner of donation, and notify authenticated user his donation was received
  if (project && owner) {
    new DonationTracker(
      donation,
      project,
      owner,
      SegmentEvents.DONATION_RECEIVED,
    ).track();

    if (!donation.anonymous) {
      const donor = await User.findOne({ id: donation.userId });

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

export const isProjectAcceptToken = async (inputData: {
  projectId: number;
  tokenId: number;
}): Promise<boolean> => {
  try {
    const { projectId, tokenId } = inputData;
    const project = await Project.createQueryBuilder('project')
      .where(`project.id = ${projectId}`)
      .getOne();
    if (!project) {
      return false;
    }
    const organizationToken = await Organization.query(
      `
        SELECT * FROM organization_tokens_token
        WHERE "tokenId" = ${tokenId} AND "organizationId" = ${project.organizationId}
        LIMIT 1
      `,
    );
    return organizationToken.length > 0;
  } catch (e) {
    logger.error('isProjectAcceptToken() error', {
      inputData,
      error: e,
    });
    return false;
  }
};
