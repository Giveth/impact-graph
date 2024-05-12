import { Field, Float, Int, ObjectType, registerEnumType } from 'type-graphql';
import { QfRound } from '../entities/qfRound';
import { AppDataSource } from '../orm';
import { QfArchivedRoundsOrderBy } from '../resolvers/qfRoundResolver';

const qfRoundEstimatedMatchingParamsCacheDuration = Number(
  process.env.QF_ROUND_ESTIMATED_MATCHING_CACHE_DURATION || 60000,
);

export const findAllQfRounds = async (): Promise<QfRound[]> => {
  return QfRound.createQueryBuilder('qf_round')
    .addOrderBy('qf_round.id', 'DESC')
    .getMany();
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

  @Field(_type => Int)
  allocatedFundUSD: number;

  @Field(_type => String)
  allocatedTokenSymbol: string;

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
    .where('"isActive" = false')
    .leftJoin('qfRound.donations', 'donation')
    .select('qfRound.id', 'id')
    .addSelect('qfRound.name', 'name')
    .addSelect('qfRound.slug', 'slug')
    .addSelect('qfRound.isActive', 'isActive')
    .addSelect('qfRound.endDate', 'endDate')
    .addSelect('qfRound.eligibleNetworks', 'eligibleNetworks')
    .addSelect('SUM(donation.amount)', 'totalDonations')
    .addSelect('COUNT(DISTINCT donation.fromWalletAddress)', 'uniqueDonors')
    .addSelect('qfRound.allocatedFund', 'allocatedFund')
    .addSelect('qfRound.allocatedFundUSD', 'allocatedFundUSD')
    .addSelect('qfRound.allocatedTokenSymbol', 'allocatedTokenSymbol')
    .addSelect('qfRound.beginDate', 'beginDate')
    .groupBy('qfRound.id')
    .orderBy(fieldMap[field], direction, 'NULLS LAST')
    .getRawMany();
  return fullRounds.slice(skip, skip + limit);
};

export const findActiveQfRound = async (): Promise<QfRound | null> => {
  return QfRound.createQueryBuilder('qf_round')
    .where('"isActive" = true')
    .getOne();
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

export async function getProjectDonationsSqrtRootSum(
  projectId: number,
  qfRoundId: number,
): Promise<{ sqrtRootSum: number; uniqueDonorsCount: number }> {
  const result = await AppDataSource.getDataSource()
    .createQueryBuilder()
    .select('"sqrtRootSum"')
    .addSelect('"uniqueDonorsCount"')
    .from('project_estimated_matching_view', 'project_estimated_matching_view')
    .where('"projectId" = :projectId AND "qfRoundId" = :qfRoundId', {
      projectId,
      qfRoundId,
    })
    // Add cache here
    .cache(
      'projectDonationsSqrtRootSum_' + projectId + '_' + qfRoundId,
      qfRoundEstimatedMatchingParamsCacheDuration,
    )
    .getRawOne();

  return {
    sqrtRootSum: result ? result.sqrtRootSum : 0,
    uniqueDonorsCount: result ? Number(result.uniqueDonorsCount) : 0,
  };
}

export const getQfRoundTotalProjectsDonationsSum = async (
  qfRoundId: number,
): Promise<{
  sum: number;
  totalDonationsSum: number;
  contributorsCount: number;
}> => {
  const result = await AppDataSource.getDataSource()
    .createQueryBuilder()
    .select(`SUM("sqrtRootSumSquared")`, 'sum')
    .addSelect(`SUM("donorsCount")`, 'contributorsCount')
    .addSelect(`SUM("sumValueUsd")`, 'totalDonationsSum') // Added sum of all donation values
    .from('project_estimated_matching_view', 'project_estimated_matching_view')
    .where('"qfRoundId" = :qfRoundId', { qfRoundId })
    // Add cache here
    .cache(
      'qfRoundTotalProjectsDonationsSum_' + qfRoundId,
      qfRoundEstimatedMatchingParamsCacheDuration,
    )
    .getRawOne();

  const sum = result?.sum || 0;
  const totalDonationsSum = result?.totalDonationsSum || 0;
  const contributorsCount = parseInt(result?.contributorsCount, 10) || 0;

  return {
    sum,
    contributorsCount,
    totalDonationsSum,
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
): Promise<{ slug: string; name: string }[]> => {
  const query = `
    SELECT "p"."slug", "p"."title" , p.id
    FROM "project" "p"
    INNER JOIN "project_qf_rounds_qf_round" "qp" ON "qp"."projectId" = "p"."id"
    WHERE "qp"."qfRoundId" = ${qfRoundId}
  `;

  return QfRound.query(query);
};
