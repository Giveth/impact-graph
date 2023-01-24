import { Project } from '../entities/project';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { ResourcesTotalPerMonthAndYear } from '../resolvers/donationResolver';
import { Reaction } from '../entities/reaction';

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
    .where(`donation.id = :donationId`, {
      donationId,
    })
    .leftJoinAndSelect('donation.project', 'project')
    .getOne();
};

export const donationsTotalAmountPerDateRange = async (
  fromDate?: string,
  toDate?: string,
): Promise<number> => {
  const query = Donation.createQueryBuilder('donation')
    .select(`COALESCE(SUM(donation."valueUsd"), 0)`, 'sum')
    .where(`donation.status = 'verified'`);

  if (fromDate) {
    query.andWhere(`donation."createdAt" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`donation."createdAt" <= '${toDate}'`);
  }
  const donationsUsdAmount = await query.getRawOne();

  query.cache(
    `donationsTotalAmountPerDateRange-${fromDate || ''}-${toDate || ''}`,
    300000,
  );

  return donationsUsdAmount.sum;
};

export const donationsTotalAmountPerDateRangeByMonth = async (
  fromDate?: string,
  toDate?: string,
): Promise<ResourcesTotalPerMonthAndYear[]> => {
  const query = Donation.createQueryBuilder('donation')
    .select(
      `COALESCE(SUM(donation."valueUsd"), 0) AS total, EXTRACT(YEAR from donation."createdAt") as year, EXTRACT(MONTH from donation."createdAt") as month, CONCAT(CAST(EXTRACT(YEAR from donation."createdAt") as VARCHAR), '/', CAST(EXTRACT(MONTH from donation."createdAt") as VARCHAR)) as date`,
    )
    .where(`donation.status = 'verified'`)
    .andWhere('donation."valueUsd" IS NOT NULL');

  if (fromDate) {
    query.andWhere(`donation."createdAt" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`donation."createdAt" <= '${toDate}'`);
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');

  query.cache(
    `donationsTotalAmountPerDateRangeByMonth-${fromDate || ''}-${toDate || ''}`,
    300000,
  );

  return await query.getRawMany();
};

export const donorsCountPerDate = async (
  fromDate?: string,
  toDate?: string,
): Promise<number> => {
  const query = Donation.createQueryBuilder('donation')
    .select(
      `CAST((COUNT(DISTINCT(donation."userId")) + SUM(CASE WHEN donation."userId" IS NULL THEN 1 ELSE 0 END)) AS int)`,
      'count',
    )
    .where(`donation.status = 'verified'`);

  if (fromDate) {
    query.andWhere(`donation."createdAt" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`donation."createdAt" <= '${toDate}'`);
  }

  query.cache(`donorsCountPerDate-${fromDate || ''}-${toDate || ''}`, 300000);

  const queryResult = await query.getRawOne();
  return queryResult.count;
};

export const donorsCountPerDateByMonthAndYear = async (
  fromDate?: string,
  toDate?: string,
): Promise<ResourcesTotalPerMonthAndYear[]> => {
  const query = Donation.createQueryBuilder('donation')
    .select(
      `CAST((COUNT(DISTINCT(donation."userId")) + SUM(CASE WHEN donation."userId" IS NULL THEN 1 ELSE 0 END)) AS int) AS total, EXTRACT(YEAR from donation."createdAt") as year, EXTRACT(MONTH from donation."createdAt") as month, CONCAT(CAST(EXTRACT(YEAR from donation."createdAt") as VARCHAR), '/', CAST(EXTRACT(MONTH from donation."createdAt") as VARCHAR)) as date`,
    )
    .where(`donation.status = 'verified'`);

  if (fromDate) {
    query.andWhere(`donation."createdAt" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`donation."createdAt" <= '${toDate}'`);
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');

  query.cache(
    `donorsCountPerDateByMonthAndYear-${fromDate || ''}-${toDate || ''}`,
    300000,
  );

  return await query.getRawMany();
};

export const getRecentDonations = async (take: number): Promise<Donation[]> => {
  return await Donation.createQueryBuilder('donation')
    .leftJoin('donation.user', 'user')
    .leftJoin('donation.project', 'project')
    .select([
      'donation.id',
      'donation.createdAt',
      'donation.valueUsd',
      'user.walletAddress',
      'project.slug',
    ])
    .where('donation.status = :status', {
      status: DONATION_STATUS.VERIFIED,
    })
    .orderBy('donation.createdAt', 'DESC')
    .take(take)
    .cache(`recent-${take}-donations`, 60000)
    .getMany();
};
