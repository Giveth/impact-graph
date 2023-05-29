import { Project } from '../entities/project';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { ResourcesTotalPerMonthAndYear } from '../resolvers/donationResolver';
import { Reaction } from '../entities/reaction';
import { Brackets, LessThan, MoreThan } from 'typeorm';
import moment from 'moment';

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

export const donationsNumberPerDateRange = async (
  fromDate?: string,
  toDate?: string,
): Promise<number> => {
  const query = Donation.createQueryBuilder('donation')
    .select(`COALESCE(COUNT(donation."valueUsd"), 0)`, 'count')
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

  return donationsUsdAmount.count;
};

export const donationsTotalNumberPerDateRangeByMonth = async (
  fromDate?: string,
  toDate?: string,
): Promise<ResourcesTotalPerMonthAndYear[]> => {
  const query = Donation.createQueryBuilder('donation')
    .select(
      `COALESCE(COUNT(donation."valueUsd"), 0) AS total, EXTRACT(YEAR from donation."createdAt") as year, EXTRACT(MONTH from donation."createdAt") as month, CONCAT(CAST(EXTRACT(YEAR from donation."createdAt") as VARCHAR), '/', CAST(EXTRACT(MONTH from donation."createdAt") as VARCHAR)) as date`,
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

export const findStableCoinDonationsWithoutPrice = () => {
  return Donation.createQueryBuilder('donation')
    .where(
      new Brackets(qb =>
        qb.where(
          `donation.currency = 'DAI' OR donation.currency= 'XDAI' OR donation.currency= 'WXDAI' OR donation.currency= 'USDT' OR donation.currency= 'USDC'`,
        ),
      ),
    )
    .andWhere(`donation."valueUsd" IS NULL `)
    .getMany();
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
      'project.title',
    ])
    .where('donation.status = :status', {
      status: DONATION_STATUS.VERIFIED,
    })
    .orderBy('donation.createdAt', 'DESC')
    .take(take)
    .cache(`recent-${take}-donations`, 60000)
    .getMany();
};

export const getPendingDonationsIds = (): Promise<{ id: number }[]> => {
  const date = moment()
    .subtract({
      hours: Number(process.env.DONATION_VERIFICAITON_EXPIRATION_HOURS),
    })
    .toDate();
  return Donation.find({
    where: {
      status: DONATION_STATUS.PENDING,
      isFiat: false,
      createdAt: MoreThan(date),
    },
    select: ['id'],
  });
};

export async function countUniqueDonorsForActiveQfRound(
  projectId: number,
): Promise<number> {
  const result = await Donation.query(
    `
    SELECT COUNT(DISTINCT "userId") 
    FROM donation 
    JOIN qf_round ON donation."qfRoundId" = qf_round.id 
    WHERE qf_round."isActive" = true
    AND donation."status" = 'verified'
    AND donation."projectId" = $1;
  `,
    [projectId],
  );
  return result[0].count;
}

export async function sumDonationValueUsdForActiveQfRound(
  projectId: number,
): Promise<number> {
  const result = await Donation.query(
    `
    SELECT SUM("valueUsd") 
    FROM donation 
    JOIN qf_round ON donation."qfRoundId" = qf_round.id 
    WHERE qf_round."isActive" = true
    AND donation."status" = 'verified'
    AND donation."projectId" = $1;
  `,
    [projectId],
  );

  // result[0].sum could be null
  return result[0].sum || 0;
}
