import { In } from 'typeorm';
import { Donation } from '../entities/donation';

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
  // tslint:disable-next-line:no-console
  console.log('donations', donations);
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

export const findDonationsByTransactionId = async (
  txHash: string,
): Promise<Donation | undefined> => {
  return Donation.createQueryBuilder('donation')
    .where(`"transactionId" = :txHash`, {
      txHash: txHash.toLowerCase(),
    })
    .getOne();
};

export const findDonationById = async (
  donationId: number,
): Promise<Donation | undefined> => {
  return Donation.createQueryBuilder('donation')
    .where(`id = :donationId`, {
      donationId,
    })
    .getOne();
};
