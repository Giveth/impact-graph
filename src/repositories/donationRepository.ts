import { In } from 'typeorm';
import { Donation } from '../entities/donation';
import { User } from '../entities/user';
import { Project } from '../entities/project';

export const findDonationWithJoinToUserAndProject = async (data: {
  fromDate?: string;
  toDate?: string;
}) => {
  const { fromDate, toDate } = data;
  const query = Donation.createQueryBuilder('donation')
    .leftJoinAndSelect('donation.user', 'user')
    .leftJoinAndSelect('donation.project', 'project');
  if (fromDate) {
    query.andWhere(`"createdAt" >= '${fromDate}'`);
  }
  if (toDate) {
    query.andWhere(`"createdAt" <= '${toDate}'`);
  }
  return await query.getMany();
};

export const findDonationWithJoinToUser = async (data: {
  fromDate?: string;
  toDate?: string;
}) => {
  const { fromDate, toDate } = data;
  const query = Donation.createQueryBuilder('donation')
    .leftJoinAndSelect('donation.user', 'user')
    .leftJoinAndSelect('donation.project', 'project');
  if (fromDate) {
    query.andWhere(`"createdAt" >= '${fromDate}'`);
  }
  if (toDate) {
    query.andWhere(`"createdAt" <= '${toDate}'`);
  }
  return await query.getMany();
};

export const findDonationsFromWalletAddresses = async (
  fromWalletAddressesArray: string[],
) => {
  const donations = await Donation.find({
    where: {
      fromWalletAddress: In(fromWalletAddressesArray),
    },
  });
  return donations;
};

export const findDonationsToWalletAddresses = async (
  toWalletAddressesArray: string[],
) => {
  const donations = await Donation.query(`SELECT * FROM "donation"
  WHERE LOWER("toWalletAddress") IN (${toWalletAddressesArray
    .map(walletAddress => `LOWER('${walletAddress}')`)
    .join(',')})
  `);
  return donations;
};

export const findDonationByUserId = async userId => {
  const donations = await Donation.find({
    where: {
      user: userId,
    },
  });
  return donations;
};

export const createDonation = async (data: {
  amount: number;
  isFiat: boolean;
  project: Project;
  transactionNetworkId: number;
  fromWalletAddress: string;
  transactionId: string;
  tokenAddress: string;
  isProjectVerified: boolean;
  donorUser: any;
  currency: string;
  isTokenEligibleForGivback: boolean;
  segmentNotified: boolean;
  toWalletAddress: string;
  donationAnonymous: boolean;
  anonymous: boolean;
  transakId: string;
  token: string;
}) => {
  const {
    amount,
    transactionId,
    isFiat,
    transactionNetworkId,
    currency,
    donorUser,
    tokenAddress,
    project,
    isTokenEligibleForGivback,
    isProjectVerified,
    donationAnonymous,
    // createdAt,
    segmentNotified,
    toWalletAddress,
    fromWalletAddress,
    anonymous,
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
