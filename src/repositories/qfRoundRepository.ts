import { Field, Float, Int, ObjectType, registerEnumType } from 'type-graphql';
import { QfRound } from '../entities/qfRound';
import { UserQfRoundModelScore } from '../entities/userQfRoundModelScore';
import { Donation } from '../entities/donation';
import { User } from '../entities/user';
import { AppDataSource } from '../orm';
import { QfArchivedRoundsOrderBy } from '../resolvers/qfRoundResolver';
import { ProjectEstimatedMatchingView } from '../entities/ProjectEstimatedMatchingView';
import { Sybil } from '../entities/sybil';
import { ProjectFraud } from '../entities/projectFraud';
import config from '../config';
import { logger } from '../utils/logger';

const qfRoundEstimatedMatchingParamsCacheDuration = Number(
  process.env.QF_ROUND_ESTIMATED_MATCHING_CACHE_DURATION || 60000,
);

const qfRoundUsersMissedMBDScore = Number(
  process.env.QF_ROUND_USERS_MISSED_SCORE || 0,
);

const qfRoundsCacheDuration =
  (config.get('QF_ROUND_AND_MAIN_CATEGORIES_CACHE_DURATION') as number) ||
  1000 * 60 * 2;

export const findQfRounds = async ({
  slug,
}: {
  slug?: string;
}): Promise<QfRound[]> => {
  const query = QfRound.createQueryBuilder('qf_round').addOrderBy(
    'qf_round.id',
    'DESC',
  );
  if (slug) {
    query.where('slug = :slug', { slug });
    const res = await query.getOne();
    return res ? [res] : [];
  }
  return query.getMany();
};

export enum QfArchivedRoundsSortType {
  allocatedFund = 'allocatedFund',
  totalDonations = 'totalDonations',
  uniqueDonors = 'uniqueDonors',
  beginDate = 'beginDate',
}

registerEnumType(QfArchivedRoundsSortType, {
  name: 'QfArchivedRoundsSortType',
  description: 'The attributes by which archived rounds can be sorted.',
});

@ObjectType()
export class QFArchivedRounds {
  @Field(_type => String)
  id: string;

  @Field(_type => String, { nullable: true })
  name: string;

  @Field(_type => String)
  slug: string;

  @Field(_type => Boolean)
  isActive: boolean;

  @Field(_type => Int)
  allocatedFund: number;

  @Field(_type => Int, { nullable: true })
  allocatedFundUSD?: number | null;

  @Field(_type => String, { nullable: true })
  allocatedTokenSymbol?: string | null;

  @Field(_type => [Int])
  eligibleNetworks: number;

  @Field(_type => Date)
  beginDate: Date;

  @Field(_type => Date)
  endDate: Date;

  @Field(_type => Float, { nullable: true })
  totalDonations: number;

  @Field(_type => String, { nullable: true })
  uniqueDonors: string;

  @Field(_type => Boolean)
  isDataAnalysisDone: boolean;
}

export const findArchivedQfRounds = async (
  limit: number,
  skip: number,
  orderBy: QfArchivedRoundsOrderBy,
): Promise<QFArchivedRounds[]> => {
  const { direction, field } = orderBy;
  const fieldMap = {
    [QfArchivedRoundsSortType.beginDate]: 'qfRound.beginDate',
    [QfArchivedRoundsSortType.allocatedFund]: 'qfRound.allocatedFund',
    [QfArchivedRoundsSortType.totalDonations]: 'SUM(donation.amount)',
    [QfArchivedRoundsSortType.uniqueDonors]:
      'COUNT(DISTINCT donation.fromWalletAddress)',
  };

  const fullRounds = await QfRound.createQueryBuilder('qfRound')
    .where('qfRound.isActive = :isActive', { isActive: false })
    .select('qfRound.id', 'id')
    .addSelect('qfRound.name', 'name')
    .addSelect('qfRound.slug', 'slug')
    .addSelect('qfRound.isActive', 'isActive')
    .addSelect('qfRound.endDate', 'endDate')
    .addSelect('qfRound.eligibleNetworks', 'eligibleNetworks')
    .addSelect('qfRound.isDataAnalysisDone', 'isDataAnalysisDone')
    .addSelect('qfRound.allocatedFund', 'allocatedFund')
    .addSelect('qfRound.allocatedFundUSD', 'allocatedFundUSD')
    .addSelect('qfRound.allocatedTokenSymbol', 'allocatedTokenSymbol')
    .addSelect('qfRound.beginDate', 'beginDate')
    .addSelect(
      qb =>
        qb
          .select('COALESCE(SUM(donation.valueUsd), 0)', 'totalDonations')
          .from(Donation, 'donation')
          .where('donation.qfRoundId = qfRound.id')
          .andWhere('donation.status = :status', { status: 'verified' })
          .andWhere(
            'donation.createdAt BETWEEN qfRound.beginDate AND qfRound.endDate',
          ),
      'totalDonations',
    )
    .addSelect(
      qb =>
        qb
          .select('COUNT(DISTINCT donation.fromWalletAddress)', 'uniqueDonors')
          .from(Donation, 'donation')
          .leftJoin(User, 'user', 'user.id = donation.userId')
          .leftJoin(
            Sybil,
            'sybil',
            'sybil.userId = user.id AND sybil.qfRoundId = qfRound.id',
          )
          .leftJoin(
            ProjectFraud,
            'projectFraud',
            'projectFraud.projectId = donation.projectId AND projectFraud.qfRoundId = qfRound.id',
          )
          .where('donation.qfRoundId = qfRound.id')
          .andWhere('donation.status = :status', { status: 'verified' })
          .andWhere('user.passportScore >= qfRound.minimumPassportScore')
          .andWhere('sybil.id IS NULL')
          .andWhere('projectFraud.id IS NULL')
          .andWhere(
            'donation.createdAt BETWEEN qfRound.beginDate AND qfRound.endDate',
          ),
      'uniqueDonors',
    )
    .groupBy('qfRound.id')
    .orderBy(fieldMap[field], direction, 'NULLS LAST')
    .getRawMany();
  return fullRounds.slice(skip, skip + limit);
};

export const findActiveQfRound = async (
  noCache?: boolean,
): Promise<QfRound | null> => {
  const query =
    QfRound.createQueryBuilder('qfRound').where('"isActive" = true');
  if (noCache) {
    return query.getOne();
  }
  return query.cache('findActiveQfRound', qfRoundsCacheDuration).getOne();
};

export const findUsersWithoutMBDScoreInActiveAround = async (): Promise<
  number[]
> => {
  const activeQfRoundId =
    (await findActiveQfRound())?.id || qfRoundUsersMissedMBDScore;

  if (!activeQfRoundId || activeQfRoundId === 0) return [];

  const usersMissingMDBScore = await QfRound.query(
    `
      SELECT DISTINCT d."userId"
      FROM public.donation d
      LEFT JOIN user_qf_round_model_score uqrms ON d."userId" = uqrms."userId" AND uqrms."qfRoundId" = $1
      WHERE d."qfRoundId" = $1
        AND d.status = 'verified'
        AND uqrms.id IS NULL
        AND d."userId" IS NOT NULL
      ORDER BY d."userId";
    `,
    [activeQfRoundId],
  );

  return usersMissingMDBScore.map(user => user.userId);
};

export const findQfRoundById = async (id: number): Promise<QfRound | null> => {
  return QfRound.createQueryBuilder('qf_round').where(`id = ${id}`).getOne();
};

export const findQfRoundBySlug = async (
  slug: string,
): Promise<QfRound | null> => {
  return QfRound.createQueryBuilder('qf_round')
    .where(`slug = '${slug}'`)
    .getOne();
};

export const getQfRoundTotalSqrtRootSumSquared = async (qfRoundId: number) => {
  const result = await ProjectEstimatedMatchingView.createQueryBuilder()
    .select('SUM("sqrtRootSumSquared")', 'totalSqrtRootSumSquared')
    .where('"qfRoundId" = :qfRoundId', { qfRoundId })
    .cache(
      'getDonationsTotalSqrtRootSumSquared_' + qfRoundId,
      qfRoundEstimatedMatchingParamsCacheDuration || 600000,
    )
    .getRawOne();
  return result ? result.totalSqrtRootSumSquared : 0;
};

export async function getProjectDonationsSqrtRootSum(
  projectId: number,
  qfRoundId: number,
): Promise<number> {
  const result = await ProjectEstimatedMatchingView.createQueryBuilder()
    .select('"sqrtRootSum"')
    .where('"projectId" = :projectId AND "qfRoundId" = :qfRoundId', {
      projectId,
      qfRoundId,
    })
    .cache(
      'projectDonationsSqrtRootSum_' + projectId + '_' + qfRoundId,
      qfRoundEstimatedMatchingParamsCacheDuration || 600000,
    )
    .getRawOne();
  return result ? result.sqrtRootSum : 0;
}

export const getQfRoundStats = async (
  qfRound: QfRound,
): Promise<{
  uniqueDonors: number;
  totalDonationUsd: number;
  donationsCount: number;
}> => {
  const { id: qfRoundId, beginDate, endDate } = qfRound;
  const result = await Donation.createQueryBuilder('donation')
    .select('COUNT(DISTINCT donation.fromWalletAddress)', 'uniqueDonors')
    .addSelect('SUM(donation.valueUsd)', 'totalDonationUsd')
    .addSelect('COALESCE(COUNT(donation.id), 0)', 'donationsCount')
    .where('donation.qfRoundId = :qfRoundId', { qfRoundId })
    .andWhere('donation.status = :status', { status: 'verified' })
    .andWhere('donation.createdAt BETWEEN :beginDate AND :endDate', {
      beginDate,
      endDate,
    })
    .cache(
      'getQfRoundStats_' + qfRoundId,
      qfRoundEstimatedMatchingParamsCacheDuration || 600000,
    )
    .getRawOne();
  return {
    uniqueDonors: parseInt(result.uniqueDonors) || 0,
    totalDonationUsd: parseFloat(result.totalDonationUsd) || 0,
    donationsCount: parseInt(result.donationsCount) || 0,
  };
};

export const getExpiredActiveQfRounds = async (): Promise<QfRound[]> => {
  const now = new Date();
  return AppDataSource.getDataSource().query(
    `
    SELECT * FROM qf_round
    WHERE "isActive" = true AND "endDate" < $1
  `,
    [now],
  );
};

export const deactivateExpiredQfRounds = async (): Promise<void> => {
  const now = new Date();
  await AppDataSource.getDataSource().query(
    `
    UPDATE qf_round
    SET "isActive" = false
    WHERE "isActive" = true AND "endDate" < $1
  `,
    [now],
  );
};

export const getRelatedProjectsOfQfRound = async (
  qfRoundId: number,
): Promise<{ slug: string; name: string; id: number }[]> => {
  const query = `
    SELECT "p"."slug", "p"."title" , p.id
    FROM "project" "p"
    INNER JOIN "project_qf_rounds_qf_round" "qp" ON "qp"."projectId" = "p"."id"
    WHERE "qp"."qfRoundId" = ${qfRoundId}
  `;

  return QfRound.query(query);
};

export const getUserMBDScore = async (
  qfRoundId: number,
  userId: number,
): Promise<number | null> => {
  if (!userId || !qfRoundId) return null;

  try {
    const result = await UserQfRoundModelScore.createQueryBuilder(
      'user_qf_round_model_score',
    )
      .select('score')
      .where('"userId" = :userId', { userId })
      .andWhere('"qfRoundId" = :qfRoundId', { qfRoundId })
      .getRawOne();

    return result?.score ?? null;
  } catch (error) {
    logger.error('Error retrieving user MBD score', {
      error,
      userId,
      qfRoundId,
    });
    return null;
  }
};

export const retrieveActiveQfRoundUserMBDScore = async (
  userId: number,
): Promise<number | null> => {
  try {
    const activeQfRound = await findActiveQfRound();
    if (!activeQfRound) return null;
    return getUserMBDScore(activeQfRound.id, userId);
  } catch (error) {
    logger.error('Error retrieving active QF round user MBD score', {
      error,
      userId,
    });
    return null;
  }
};

/**
 * Find all active QF rounds for a project
 *
 * @param projectId - The ID of the project
 * @returns An array of active QF rounds
 */
export async function findActiveQfRoundsForProject(
  projectId: number,
): Promise<QfRound[]> {
  return QfRound.createQueryBuilder('qfRound')
    .innerJoin('qfRound.projects', 'project')
    .where('qfRound.isActive = :isActive', { isActive: true })
    .andWhere('project.id = :projectId', { projectId })
    .getMany();
}

/**
 * Pick the best QF round for a project
 *
 * @param rounds - The array of QF rounds
 * @param networkId - The network ID
 * @returns
 */
export function pickBestQfRound(rounds: QfRound[], networkId: number): QfRound {
  const matches = rounds.filter(
    r =>
      Array.isArray(r.eligibleNetworks) &&
      r.eligibleNetworks.includes(networkId),
  );

  if (matches.length === 0) {
    throw new Error('no eligible qf rounds');
  }

  // 0)Return first one is there is only one
  if (matches.length === 1) return matches[0];

  // 1) highest allocatedFundUSD
  const maxUsd = Math.max(...matches.map(r => Number(r.allocatedFundUSD ?? 0)));
  let tied = matches.filter(r => Number(r.allocatedFundUSD ?? 0) === maxUsd);

  // 2) closest endDate that is >= now (if none >= now, use soonest endDate anyway)
  if (tied.length > 1) {
    const now = Date.now();
    const future = tied.filter(
      r => new Date(r.endDate as any).getTime() >= now,
    );
    const pool = future.length ? future : tied;

    pool.sort(
      (a, b) =>
        new Date(a.endDate as any).getTime() -
        new Date(b.endDate as any).getTime(),
    );
    const bestEnd = new Date(pool[0].endDate as any).getTime();
    tied = pool.filter(r => new Date(r.endDate as any).getTime() === bestEnd);

    // TODO: MISSING PRIORITY LOGIC

    // 3) highest priority = LOWEST integer wins
    // if (tied.length > 1) {
    //   tied.sort(
    //     (a: any, b: any) =>
    //       Number(a.priority ?? 99999) - Number(b.priority ?? 99999),
    //   );
    // }
  }

  return tied[0];
}
