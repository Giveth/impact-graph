import { Project } from '../entities/project';
import { Donation } from '../entities/donation';

export const createDonation = async (data: {
  amount: number;
  project: Project;
  transactionNetworkId: number;
  fromWalletAddress: string;
  transactionId: string;
  tokenAddress: string;
  isProjectVerified: boolean;
  donorUser: any;
  isTokenEligibleForGivback: boolean;
  segmentNotified: boolean;
  toWalletAddress: string;
  donationAnonymous: boolean;
  transakId: string;
  token: string;
}): Promise<Donation> => {
  const {
    amount,
    transactionId,
    transactionNetworkId,
    donorUser,
    tokenAddress,
    project,
    isTokenEligibleForGivback,
    isProjectVerified,
    donationAnonymous,
    toWalletAddress,
    fromWalletAddress,
    transakId,
    token,
  } = data;
  const donation = await Donation.create({
    amount: Number(amount),
    transactionId: transactionId?.toLowerCase() || transakId,
    isFiat: Boolean(transakId),
    transactionNetworkId: Number(transactionNetworkId),
    currency: token,
    user: donorUser,
    tokenAddress,
    project,
    isTokenEligibleForGivback,
    isProjectVerified,
    createdAt: new Date(),
    segmentNotified: true,
    toWalletAddress,
    fromWalletAddress,
    anonymous: donationAnonymous,
  }).save();
  return donation;
};

export const findDonationsByTransactionId = async (
  txHash: string,
): Promise<Donation | null> => {
  return Donation.createQueryBuilder('donation')
    .where(`"transactionId" = :txHash`, {
      txHash: txHash.toLowerCase(),
    })
    .getOne();
};

export const findDonationById = async (
  donationId: number,
): Promise<Donation | null> => {
  return Donation.createQueryBuilder('donation')
    .where(`donation.id = :donationId`, {
      donationId,
    })
    .leftJoinAndSelect('donation.project', 'project')
    .getOne();
};
