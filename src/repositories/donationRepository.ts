import { MoreThan } from 'typeorm';
import moment from 'moment';
import { Project } from '../entities/project';
import { Donation, DONATION_STATUS } from '../entities/donation';
import { ResourcesTotalPerMonthAndYear } from '../resolvers/donationResolver';
import { logger } from '../utils/logger';
import { QfRound } from '../entities/qfRound';
import { ChainType } from '../types/network';
import { ORGANIZATION_LABELS } from '../entities/organization';
import { AppDataSource } from '../orm';
import { getPowerRound } from './powerRoundRepository';

export const exportClusterMatchingDonationsFormat = async (
  qfRoundId: number,
) => {
  return await Donation.query(
    `
    SELECT 
      d."fromWalletAddress" AS voter,
      d."toWalletAddress" AS "payoutAddress",
      d."valueUsd" AS "amountUSD",
      p."title" AS "project_name",
      CASE 
        WHEN d."qfRoundUserScore" IS NOT NULL THEN d."qfRoundUserScore"
        ELSE u."passportScore"
      END AS score
    FROM
      donation d
    INNER JOIN 
      project p ON d."projectId" = p."id"
    INNER JOIN 
      "user" u ON d."userId" = u."id"
    WHERE 
      d."qfRoundId" = $1
  `,
    [qfRoundId],
  );
};

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
  isProjectGivbackEligible: boolean;
  donorUser: any;
  isTokenEligibleForGivback: boolean;
  segmentNotified: boolean;
  toWalletAddress: string;
  donationAnonymous: boolean;
  transakId: string;
  token: string;
  chainType?: ChainType;
  valueUsd?: number;
  priceUsd?: number;
  status?: string;
  isQRDonation?: boolean;
  toWalletMemo?: string;
  qfRound?: QfRound;
  givbackFactor?: number;
  projectRank?: number;
  bottomRankInRound?: number;
  powerRound?: number;
}): Promise<Donation> => {
  const {
    amount,
    transactionId,
    transactionNetworkId,
    donorUser,
    tokenAddress,
    project,
    isTokenEligibleForGivback,
    isProjectGivbackEligible,
    donationAnonymous,
    toWalletAddress,
    fromWalletAddress,
    transakId,
    token,
    chainType,
    valueUsd,
    priceUsd,
    status,
    isQRDonation,
    toWalletMemo,
    qfRound,
    givbackFactor,
    projectRank,
    bottomRankInRound,
    powerRound,
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
    isProjectGivbackEligible,
    createdAt: new Date(),
    segmentNotified: true,
    toWalletAddress,
    fromWalletAddress,
    anonymous: donationAnonymous,
    chainType,
    valueUsd,
    priceUsd,
    status,
    isQRDonation,
    toWalletMemo,
    qfRound,
    givbackFactor,
    projectRank,
    bottomRankInRound,
    powerRound,
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
  networkId?: number,
  onlyVerified?: boolean,
  onlyEndaoment?: boolean,
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

  if (networkId) {
    query.andWhere(`donation."transactionNetworkId" = ${networkId}`);
  }

  if (onlyVerified) {
    query
      .leftJoin('donation.project', 'project')
      .andWhere('project.verified = true');
  }

  if (onlyEndaoment) {
    if (!onlyVerified) {
      query.leftJoin('donation.project', 'project');
    }
    query
      .leftJoin('project.organization', 'organization')
      .andWhere('organization."label" = :label', {
        label: ORGANIZATION_LABELS.ENDAOMENT,
      });
  }

  const donationsUsdAmount = await query.getRawOne();

  query.cache(
    `donationsTotalAmountPerDateRange-${fromDate || ''}-${toDate || ''}-${
      networkId || 'all'
    }-${onlyVerified || 'all'}-${onlyEndaoment || 'all'}`,
    300000,
  );

  return donationsUsdAmount.sum;
};

export const donationsTotalAmountPerDateRangeByMonth = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyVerified?: boolean,
  onlyEndaoment?: boolean,
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

  if (networkId) {
    query.andWhere(`donation."transactionNetworkId" = ${networkId}`);
  }

  if (onlyVerified) {
    query
      .leftJoin('donation.project', 'project')
      .andWhere('project.verified = true');
  }

  if (onlyEndaoment) {
    if (!onlyVerified) {
      query.leftJoin('donation.project', 'project');
    }
    query
      .leftJoin('project.organization', 'organization')
      .andWhere('organization."label" = :label', {
        label: ORGANIZATION_LABELS.ENDAOMENT,
      });
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');

  query.cache(
    `donationsTotalAmountPerDateRangeByMonth-${fromDate || ''}-${
      toDate || ''
    }-${networkId || 'all'}-${onlyVerified || 'all'}-${onlyEndaoment || 'all'}`,
    300000,
  );

  return await query.getRawMany();
};

export const donationsNumberPerDateRange = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyVerified?: boolean,
  onlyEndaoment?: boolean,
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

  if (networkId) {
    query.andWhere(`donation."transactionNetworkId" = ${networkId}`);
  }

  if (onlyVerified) {
    query
      .leftJoin('donation.project', 'project')
      .andWhere('project.verified = true');
  }

  if (onlyEndaoment) {
    if (!onlyVerified) {
      query.leftJoin('donation.project', 'project');
    }
    query
      .leftJoin('project.organization', 'organization')
      .andWhere('organization."label" = :label', {
        label: ORGANIZATION_LABELS.ENDAOMENT,
      });
  }

  const donationsUsdAmount = await query.getRawOne();

  query.cache(
    `donationsTotalNumberPerDateRange-${fromDate || ''}-${toDate || ''}--${
      networkId || 'all'
    }-${onlyVerified || 'all'}-${onlyEndaoment || 'all'}`,
    300000,
  );

  return donationsUsdAmount.count;
};

export const donationsTotalNumberPerDateRangeByMonth = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyVerified?: boolean,
  onlyEndaoment?: boolean,
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

  if (networkId) {
    query.andWhere(`donation."transactionNetworkId" = ${networkId}`);
  }

  if (onlyVerified) {
    query
      .leftJoin('donation.project', 'project')
      .andWhere('project.verified = true');
  }

  if (onlyEndaoment) {
    if (!onlyVerified) {
      query.leftJoin('donation.project', 'project');
    }
    query
      .leftJoin('project.organization', 'organization')
      .andWhere('organization."label" = :label', {
        label: ORGANIZATION_LABELS.ENDAOMENT,
      });
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');

  query.cache(
    `donationsTotalNumberPerDateRangeByMonth-${fromDate || ''}-${
      toDate || ''
    }-${networkId || 'all'}-${onlyVerified || 'all'}-${onlyEndaoment || 'all'}`,
    300000,
  );

  return await query.getRawMany();
};

export const donorsCountPerDate = async (
  fromDate?: string,
  toDate?: string,
  networkId?: number,
  onlyEndaoment?: boolean,
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

  if (networkId) {
    query.andWhere(`donation."transactionNetworkId" = ${networkId}`);
  }
  if (onlyEndaoment) {
    query.leftJoin('donation.project', 'project');
    query.leftJoin('project.organization', 'organization');
    query.andWhere('organization."label" = :label', {
      label: ORGANIZATION_LABELS.ENDAOMENT,
    });
  }

  query.cache(
    `donorsCountPerDate-${fromDate || ''}-${toDate || ''}-${
      networkId || 'all'
    }-${onlyEndaoment || 'all'}`,
    300000,
  );

  const queryResult = await query.getRawOne();
  return queryResult.count;
};

export const newDonorsCount = async (fromDate: string, toDate: string) => {
  return Donation.createQueryBuilder('donation')
    .select(
      `
    CASE 
      WHEN donation."userId" IS NOT NULL THEN CONCAT('user_', donation."userId") 
      ELSE CONCAT('anon_', donation."fromWalletAddress") 
    END
  `,
      'donor_identity',
    )
    .addSelect('MIN(donation."createdAt")', 'firstDonationDate')
    .where('"valueUsd" IS NOT NULL')
    .andWhere(
      '(donation."userId" IS NOT NULL OR donation."fromWalletAddress" IS NOT NULL)',
    )
    .groupBy('donor_identity')
    .having('MIN(donation."createdAt") BETWEEN :fromDate AND :toDate', {
      fromDate,
      toDate,
    })
    .getRawMany();
};

export const newDonorsDonationTotalUsd = async (
  fromDate: string,
  toDate: string,
) => {
  const result = await Donation.query(
    `
    SELECT SUM(d."valueUsd") AS total_usd_value_of_first_donations
    FROM (
      SELECT 
        CASE 
          WHEN "userId" IS NOT NULL THEN CONCAT('user_', "userId")
          ELSE CONCAT('anon_', "fromWalletAddress")
        END AS donor_identity,
        MIN("createdAt") AS firstDonationDate
      FROM "donation"
      WHERE "valueUsd" IS NOT NULL
        AND ("userId" IS NOT NULL OR "fromWalletAddress" IS NOT NULL)
      GROUP BY donor_identity
    ) AS first_donations
    JOIN "donation" d 
      ON (
        CASE 
          WHEN d."userId" IS NOT NULL THEN CONCAT('user_', d."userId")
          ELSE CONCAT('anon_', d."fromWalletAddress")
        END
      ) = first_donations.donor_identity
      AND d."createdAt" = first_donations.firstDonationDate
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
  networkId?: number,
  onlyEndaoment?: boolean,
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

  if (networkId) {
    query.andWhere(`donation."transactionNetworkId" = ${networkId}`);
  }

  if (onlyEndaoment) {
    query.leftJoin('donation.project', 'project');
    query.leftJoin('project.organization', 'organization');
    query
      .andWhere('organization."label" = :label')
      .setParameter('label', ORGANIZATION_LABELS.ENDAOMENT);
  }

  query.groupBy('year, month');
  query.orderBy('year', 'ASC');
  query.addOrderBy('month', 'ASC');

  query.cache(
    `donorsCountPerDateByMonthAndYear-${fromDate || ''}-${toDate || ''}-${
      networkId || 'all'
    } - ${onlyEndaoment || 'all'}`,
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
    .leftJoin('donation.project', 'project')
    .select('project.adminUserId')
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

export const getSumOfGivbackEligibleDonationsForSpecificRound = async (params: {
  powerRound?: number;
}): Promise<number> => {
  // This function calculates the total USD value of all donations that are eligible for Givback in a specific PowerRound

  try {
    // If no powerRound is passed, get the latest one from the PowerRound table
    const powerRound = params.powerRound || (await getPowerRound())?.round;
    if (!powerRound) {
      throw new Error('No powerRound found in the database.');
    }

    // Execute the main raw SQL query with the powerRound
    const result = await AppDataSource.getDataSource().query(
      `
          SELECT 
            SUM("donation"."valueUsd" * "donation"."givbackFactor") AS "totalUsdWithGivbackFactor"
          FROM "donation"
          WHERE "donation"."status" = 'verified'
            AND "donation"."isProjectGivbackEligible" = true
            AND "donation"."powerRound" = $1
            AND NOT EXISTS (
                      SELECT 1
                      FROM "project_address" "pa"
                      INNER JOIN "project" "p" ON "p"."id" = "pa"."projectId"
                      WHERE "pa"."address" = "donation"."fromWalletAddress"
                        AND "pa"."isRecipient" = true
                        AND "p"."verified" = true
                  );
                `,
      [powerRound],
    );

    return result?.[0]?.totalUsdWithGivbackFactor ?? 0;
  } catch (e) {
    logger.error('getSumOfGivbackEligibleDonationsForSpecificRound() error', e);
    return 0;
  }
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
}): Promise<{
  uniqueDonorsCount: number;
  sumValueUsd: number;
  donationsCount: number;
}> {
  const { projectId, qfRound } = params;
  const { id: qfRoundId, beginDate, endDate } = qfRound;
  const result = await Donation.createQueryBuilder('donation')
    .select(
      'COUNT(DISTINCT donation."userId") + COUNT(*) FILTER (WHERE donation."userId" IS NULL)',
      'uniqueDonors',
    )
    .addSelect('COALESCE(SUM(donation.valueUsd), 0)', 'totalDonationValueUsd')
    .addSelect('COALESCE(COUNT(donation.id), 0)', 'donationsCount')
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
    donationsCount: parseInt(result.donationsCount, 10) || 0,
  };
}

export async function countUniqueDonorsAndSumDonationValueUsd(
  projectId: number,
): Promise<{ totalDonations: number; uniqueDonors: number }> {
  const result = await Donation.createQueryBuilder('donation')
    .select('COALESCE(SUM(donation.valueUsd), 0)', 'totalDonations')
    .addSelect(
      'COUNT(DISTINCT donation."userId") + COUNT(*) FILTER (WHERE donation."userId" IS NULL)',
      'uniqueDonors',
    )
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
        FROM donation as d
        INNER JOIN "qf_round" as qr on qr.id = $1
        WHERE 
          d.status = 'verified' AND 
          d."qfRoundId" = $1 AND 
          d."projectId" = $2 AND 
          d."userId" = $3 AND
          d."createdAt" >= qr."beginDate" AND d."createdAt" <= qr."endDate"
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

export async function findDonationsByProjectIdWhichUseDonationBox(
  startDate: Date,
  endDate: Date,
  projectId: number,
): Promise<Donation[]> {
  return await Donation.query(
    `
  SELECT * FROM donation
  WHERE "createdAt" BETWEEN $1 AND $2
  AND "useDonationBox" = $3
  AND "projectId" = $4
`,
    [startDate, endDate, true, projectId],
  );
}

export const findDonationBySwapId = async (
  swapId: number,
): Promise<Donation | null> => {
  return Donation.createQueryBuilder('donation')
    .where(`donation.swapTransactionId = :swapId`, {
      swapId,
    })
    .getOne();
};
