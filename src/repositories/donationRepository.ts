import { In } from 'typeorm';
import { Donation } from '../entities/donation';
import { User } from '../entities/user';

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
  const donations = await Donation.query(`SELECT * FROM donations
  WHERE LOWER("toWalletAddress") IN LOWER('${toWalletAddressesArray}')
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
