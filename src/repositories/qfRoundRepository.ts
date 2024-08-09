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
