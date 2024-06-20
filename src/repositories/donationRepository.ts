import { MoreThan } from 'typeorm';
import moment from 'moment';
import { Project } from '../entities/project';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { ResourcesTotalPerMonthAndYear } from '../resolvers/donationResolver';
import { logger } from '../utils/logger';
import { QfRound } from '../entities/qfRound';

export const fillQfRoundDonationsUserScores = async (): Promise<void> => {
  await Donation.query(`
    UPDATE donation
    SET "qfRoundUserScore" = u."passportScore"
    FROM "user" u
    WHERE donation."userId" = u.id
    AND "qfRoundUserScore" IS NULL
    AND donation.status = 'verified'
    AND EXISTS(
      SELECT 1
      FROM qf_round q
      WHERE q.id = donation."qfRoundId"
      AND q."isActive" = false
      AND q."endDate" < NOW()
    );
  `);
};

// example 110356996 returns just one transaction
// for bigger block ranges run multiple times with additional endBlock param in tippingContract.queryFilter()
export const getLatestBlockNumberFromDonations = async (): Promise<number> => {
  const latestDonation = await Donation.createQueryBuilder('donation')
    .select('MAX(donation.blockNumber)', 'maxBlock')
    .where('donation.isExternal = true')
    .getRawOne();

  return (
    latestDonation?.maxBlock ||
    Number(process.env.IDRISS_STARTING_BLOCKNUMBER || 110356996)
  );
};

export const isTransactionHashStored = async (
  transactionHash: string,
): Promise<boolean> => {
  const donationCount = await Donation.count({
    where: { transactionId: transactionHash?.toLowerCase() },
  });

  return donationCount > 0;
};

export const addressHasDonated = async (address: string) => {
  const projectAddress = await Donation.query(
    `
          SELECT "id"
          FROM donation
          where lower("fromWalletAddress") = $1
          limit 1
    `,
    [address.toLowerCase()],
  );
  return projectAddress.length > 0;
};

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
    .leftJoinAndSelect('donation.qfRound', 'qfRound')
    .getOne();
};

export const donationsTotalAmountPerDateRange = async (
  fromDate?: string,
  toDate?: string,
  fromOptimismOnly?: boolean,
  onlyVerified?: boolean,
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

  if (fromOptimismOnly) {
    query.andWhere(`donation."transactionNetworkId" = 10`);
  }

  if (onlyVerified) {
    query
      .leftJoin('donation.project', 'project')
      .andWhere('project.verified = true');
  }

  const donationsUsdAmount = await query.getRawOne();

  query.cache(
    `donationsTotalAmountPerDateRange-${fromDate || ''}-${toDate || ''}-${
      fromOptimismOnly || 'all'
    }-${onlyVerified || 'all'}`,
    300000,
  );

  return donationsUsdAmount.sum;
};

export const donationsTotalAmountPerDateRangeByMonth = async (
  fromDate?: string,
  toDate?: string,
  fromOptimismOnly?: boolean,
  onlyVerified?: boolean,
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

  if (fromOptimismOnly) {
    query.andWhere(`donation."transactionNetworkId" = 10`);
  }

  if (onlyVerified) {
    query
      .leftJoin('donation.project', 'project')
      .andWhere('project.verified = true');
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');

  query.cache(
    `donationsTotalAmountPerDateRangeByMonth-${fromDate || ''}-${
      toDate || ''
    }-${fromOptimismOnly || 'all'}-${onlyVerified || 'all'}`,
    300000,
  );

  return await query.getRawMany();
};

export const donationsNumberPerDateRange = async (
  fromDate?: string,
  toDate?: string,
  fromOptimismOnly?: boolean,
  onlyVerified?: boolean,
): Promise<number> => {
  const query = Donation.createQueryBuilder('donation')
    .select(`COALESCE(COUNT(donation.id), 0)`, 'count')
    .where(`donation.status = 'verified'`);

  if (fromDate) {
    query.andWhere(`donation."createdAt" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`donation."createdAt" <= '${toDate}'`);
  }

  if (fromOptimismOnly) {
    query.andWhere(`donation."transactionNetworkId" = 10`);
  }

  if (onlyVerified) {
    query
      .leftJoin('donation.project', 'project')
      .andWhere('project.verified = true');
  }

  const donationsUsdAmount = await query.getRawOne();

  query.cache(
    `donationsTotalNumberPerDateRange-${fromDate || ''}-${toDate || ''}--${
      fromOptimismOnly || 'all'
    }-${onlyVerified || 'all'}`,
    300000,
  );

  return donationsUsdAmount.count;
};

export const donationsTotalNumberPerDateRangeByMonth = async (
  fromDate?: string,
  toDate?: string,
  fromOptimismOnly?: boolean,
  onlyVerified?: boolean,
): Promise<ResourcesTotalPerMonthAndYear[]> => {
  const query = Donation.createQueryBuilder('donation')
    .select(
      `COALESCE(COUNT(donation.id), 0) AS total, EXTRACT(YEAR from donation."createdAt") as year, EXTRACT(MONTH from donation."createdAt") as month, CONCAT(CAST(EXTRACT(YEAR from donation."createdAt") as VARCHAR), '/', CAST(EXTRACT(MONTH from donation."createdAt") as VARCHAR)) as date`,
    )
    .where(`donation.status = 'verified'`);

  if (fromDate) {
    query.andWhere(`donation."createdAt" >= '${fromDate}'`);
  }

  if (toDate) {
    query.andWhere(`donation."createdAt" <= '${toDate}'`);
  }

  if (fromOptimismOnly) {
    query.andWhere(`donation."transactionNetworkId" = 10`);
  }

  if (onlyVerified) {
    query
      .leftJoin('donation.project', 'project')
      .andWhere('project.verified = true');
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');

  query.cache(
    `donationsTotalNumberPerDateRangeByMonth-${fromDate || ''}-${
      toDate || ''
    }-${fromOptimismOnly || 'all'}-${onlyVerified || 'all'}`,
    300000,
  );

  return await query.getRawMany();
};

export const donorsCountPerDate = async (
  fromDate?: string,
  toDate?: string,
  fromOptimismOnly?: boolean,
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

  if (fromOptimismOnly) {
    query.andWhere(`donation."transactionNetworkId" = 10`);
  }

  query.cache(
    `donorsCountPerDate-${fromDate || ''}-${toDate || ''}-${
      fromOptimismOnly || 'all'
    }`,
    300000,
  );

  const queryResult = await query.getRawOne();
  return queryResult.count;
};

export const newDonorsCount = async (fromDate: string, toDate: string) => {
  return Donation.createQueryBuilder('donation')
    .select('donation.userId')
    .addSelect('MIN(donation.createdAt)')
    .groupBy('donation.userId')
    .having('MIN(donation.createdAt) BETWEEN :fromDate AND :toDate', {
      fromDate,
      toDate,
    })
    .groupBy('donation.userId')
    .getRawMany();
};

export const newDonorsDonationTotalUsd = async (
  fromDate: string,
  toDate: string,
) => {
  const result = await Donation.query(
    `SELECT SUM(d."valueUsd") AS total_usd_value_of_first_donations
FROM (
    SELECT "userId", MIN("createdAt") AS firstDonationDate
    FROM "donation"
    GROUP BY "userId"
) AS first_donations
JOIN "donation" d ON first_donations."userId" = d."userId" AND first_donations.firstDonationDate = d."createdAt"
WHERE d."createdAt" BETWEEN $1 AND $2
  AND d."valueUsd" IS NOT NULL;
`,
    [fromDate, toDate],
  );
  return result[0]?.total_usd_value_of_first_donations || 0;
};

export const donorsCountPerDateByMonthAndYear = async (
  fromDate?: string,
  toDate?: string,
  fromOptimismOnly?: boolean,
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

  if (fromOptimismOnly) {
    query.andWhere(`donation."transactionNetworkId" = 10`);
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');

  query.cache(
    `donorsCountPerDateByMonthAndYear-${fromDate || ''}-${toDate || ''}-${
      fromOptimismOnly || 'all'
    }`,
    300000,
  );

  return await query.getRawMany();
};

export const findStableCoinDonationsWithoutPrice = async (): Promise<
  Donation[]
> => {
  return await Donation.createQueryBuilder('donation')
    .leftJoin(
      'token',
      'token',
      'donation.currency = token.symbol AND donation.transactionNetworkId = token.networkId',
    )
    .where('token.isStableCoin = true')
    .andWhere('donation.valueUsd IS NULL')
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
    where: [
      {
        status: DONATION_STATUS.PENDING,
        isFiat: false,
        createdAt: MoreThan(date),
      },
      {
        status: DONATION_STATUS.PENDING,
        isFiat: false,
        importDate: MoreThan(date),
      },
    ],
    select: ['id'],
  });
};

export async function getProjectQfRoundStats(params: {
  projectId: number;
  qfRound: QfRound;
}): Promise<{ uniqueDonorsCount: number; sumValueUsd: number }> {
  const { projectId, qfRound } = params;
  const { id: qfRoundId, beginDate, endDate } = qfRound;
  const result = await Donation.createQueryBuilder('donation')
    .select('COUNT(DISTINCT donation.userId)', 'uniqueDonors')
    .addSelect('SUM(donation.valueUsd)', 'totalDonationValueUsd')
    .where('donation.qfRoundId = :qfRoundId', { qfRoundId })
    .andWhere('donation.projectId = :projectId', { projectId })
    .andWhere('donation.status = :status', { status: 'verified' })
    .andWhere('donation.createdAt BETWEEN :beginDate AND :endDate', {
      beginDate,
      endDate,
    })
    .getRawOne();

  return {
    uniqueDonorsCount: parseInt(result.uniqueDonors, 10) || 0,
    sumValueUsd: parseFloat(result.totalDonationValueUsd) || 0,
  };
}

export async function countUniqueDonorsAndSumDonationValueUsd(
  projectId: number,
): Promise<{ totalDonations: number; uniqueDonors: number }> {
  const result = await Donation.createQueryBuilder('donation')
    .select('SUM(donation.valueUsd)', 'totalDonations')
    .addSelect('COUNT(DISTINCT donation.userId)', 'uniqueDonors')
    .where('donation.projectId = :projectId', { projectId })
    .andWhere('donation.status = :status', { status: 'verified' })
    .getRawOne();
  return {
    totalDonations: parseFloat(result.totalDonations) || 0,
    uniqueDonors: parseInt(result.uniqueDonors) || 0,
  };
}

export async function isVerifiedDonationExistsInQfRound(params: {
  qfRoundId: number;
  projectId: number;
  userId: number;
}): Promise<boolean> {
  try {
    const result = await Donation.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM donation
        WHERE 
          status = 'verified' AND 
          "qfRoundId" = $1 AND 
          "projectId" = $2 AND 
          "userId" = $3
      ) AS exists;
      `,
      [params.qfRoundId, params.projectId, params.userId],
    );
    return result?.[0]?.exists || false;
  } catch (err) {
    logger.error(
      'Error executing the query in isVerifiedDonationExists() function',
      err,
    );
    return false;
  }
}
