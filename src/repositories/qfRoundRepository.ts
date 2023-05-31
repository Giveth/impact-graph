import { QfRound } from '../entities/qfRound';
import { AppDataSource } from '../orm';
import config from '../config';

const isTestEnv = (config.get('ENVIRONMENT') as string) === 'test';

export const findAllQfRounds = async (): Promise<QfRound[]> => {
  return QfRound.createQueryBuilder('qf_round')
    .addOrderBy('qf_round.id', 'DESC')
    .getMany();
};

export const findActiveQfRound = async (): Promise<QfRound | null> => {
  return QfRound.createQueryBuilder('qf_round')
    .where('"isActive" = true')
    .getOne();
};

export const relateManyProjectsToQfRound = async (params: {
  projectIds: number[];
  qfRoundId: number;
  add: boolean;
}) => {
  const values = params.projectIds
    .map(projectId => `(${projectId}, ${params.qfRoundId})`)
    .join(', ');

  let query;

  if (params.add) {
    query = `
      INSERT INTO project_qf_rounds_qf_round ("projectId", "qfRoundId") 
      VALUES ${values}
      ON CONFLICT ("projectId", "qfRoundId") DO NOTHING;`;
  } else {
    const projectIds = params.projectIds.join(',');
    query = `
      DELETE FROM project_qf_rounds_qf_round
      WHERE "qfRoundId" = ${params.qfRoundId}
        AND "projectId" IN (${projectIds});`;
  }

  return QfRound.query(query);
};

export const getProjectDonationsSqrtRootSum = async (
  projectId: number,
  qfRoundId: number,
): Promise<{ sqrtRootSum: number; count: number }> => {
  const result = await AppDataSource.getDataSource()
    .createQueryBuilder()
    .select('sum(sqrt("valueUsd"))', 'sqrtRootSum')
    .addSelect('count(*)', 'count')
    .from(donationGroupByUserSubQuery => {
      return donationGroupByUserSubQuery
        .select('sum(coalesce("valueUsd", 0))', 'valueUsd')
        .addSelect('donation.userId', 'userId')
        .from('donation', 'donation')
        .where('"projectId" = :projectId and "qfRoundId" = :qfRoundId', {
          projectId,
          qfRoundId,
        })
        .groupBy('donation.userId');
    }, 'donationsGroupByUser')
    .groupBy()
    .cache(`pr-dn-sqrt-sum-${projectId}-${qfRoundId}`, 60000)
    .getRawOne();
  return {
    sqrtRootSum: result?.sqrtRootSum || 0,
    count: result?.count ? parseInt(result.count, 10) : 0,
  };
};

export const getProjectDonationsSqrtRootSumToThePowerOfTwo = async (
  projectId: number,
  qfRoundId: number,
): Promise<{ sqrtRootSum: number; count: number }> => {
  const result = await AppDataSource.getDataSource()
    .createQueryBuilder()
    .select('power(sum(sqrt("valueUsd")),2)', 'sqrtRootSum')
    .addSelect('count(*)', 'count')
    .from(donationGroupByUserSubQuery => {
      return donationGroupByUserSubQuery
        .select('sum(coalesce("valueUsd", 0))', 'valueUsd')
        .addSelect('donation.userId', 'userId')
        .from('donation', 'donation')
        .where('"projectId" = :projectId and "qfRoundId" = :qfRoundId', {
          projectId,
          qfRoundId,
        })
        .groupBy('donation.userId');
    }, 'donationsGroupByUser')
    .groupBy()
    .cache(`pr-dn-sqrt-sum-pw2-${projectId}-${qfRoundId}`, 60000)
    .getRawOne();
  return {
    sqrtRootSum: result?.sqrtRootSum || 0,
    count: result?.count ? parseInt(result.count, 10) : 0,
  };
};

export const getQfRoundTotalProjectsDonationsSumExcludingProjectById = async (
  projectId: number,
  qfRoundId: number,
): Promise<{
  sum: number;
  contributorsCount;
}> => {
  let query = AppDataSource.getDataSource()
    .createQueryBuilder()
    .select('sum("sqrtRootSumSquared")', 'sqrtRootSumSquaredSum')
    .addSelect('sum("donorsCount")', 'contributorsCount')
    .from(subQuery => {
      return subQuery
        .select('power(sum(sqrt("valueUsd")), 2)', 'sqrtRootSumSquared')
        .addSelect('count("userId")', 'donorsCount')
        .from(donationGroupByUserSubQuery => {
          return donationGroupByUserSubQuery
            .select('sum(coalesce("valueUsd", 0))', 'valueUsd')
            .addSelect('donation.userId', 'userId')
            .addSelect('donation.projectId', 'projectId')
            .from('donation', 'donation')
            .where('"qfRoundId" = :qfRoundId', {
              qfRoundId,
            })
            .andWhere('donation.projectId != :projectId', {
              projectId,
            })
            .groupBy('donation.userId')
            .addGroupBy('donation.projectId');
        }, 'donationsGroupByUser')
        .groupBy('"projectId"');
    }, 'resultGroupByProject')
    .groupBy();

  // if it's not test env, cache the query for 5 minutes (300_000 ms)
  if (!isTestEnv) {
    query = query.cache(`pr-dn-sqrt-sum-ex-pr-${qfRoundId}`, 300_000);
  }

  const result = await query.getRawOne();

  return {
    sum: result?.sqrtRootSumSquaredSum || 0,
    contributorsCount: result?.contributorsCount
      ? parseInt(result.contributorsCount, 10)
      : 0,
  };
};

//
export const getQfRoundTotalProjectsDonationsSum = async (
  qfRoundId: number,
): Promise<{
  sum: number;
  contributorsCount;
}> => {
  let query = AppDataSource.getDataSource()
    .createQueryBuilder()
    .select('sum("sqrtRootSumSquared")', 'sqrtRootSumSquaredSum')
    .addSelect('sum("donorsCount")', 'contributorsCount')
    .from(subQuery => {
      return subQuery
        .select('power(sum(sqrt("valueUsd")), 2)', 'sqrtRootSumSquared')
        .addSelect('count("userId")', 'donorsCount')
        .from(donationGroupByUserSubQuery => {
          return donationGroupByUserSubQuery
            .select('sum(coalesce("valueUsd", 0))', 'valueUsd')
            .addSelect('donation.userId', 'userId')
            .addSelect('donation.projectId', 'projectId')
            .from('donation', 'donation')
            .where('"qfRoundId" = :qfRoundId', {
              qfRoundId,
            })
            .groupBy('donation.userId')
            .addGroupBy('donation.projectId');
        }, 'donationsGroupByUser')
        .groupBy('"projectId"');
    }, 'resultGroupByProject')
    .groupBy();

  // if it's not test env, cache the query for 5 minutes (300_000 ms)
  if (!isTestEnv) {
    query = query.cache(`pr-dn-sqrt-sum-${qfRoundId}`, 300_000);
  }

  const result = await query.getRawOne();

  return {
    sum: result?.sqrtRootSumSquaredSum || 0,
    contributorsCount: result?.contributorsCount
      ? parseInt(result.contributorsCount, 10)
      : 0,
  };
};
