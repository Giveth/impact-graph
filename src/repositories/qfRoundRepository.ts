import { QfRound } from '../entities/qfRound';
import { AppDataSource } from '../orm';
import config from '../config';
import { isTestEnv } from '../utils/utils';

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

export async function getProjectDonationsSqrtRootSum(
  projectId: number,
  qfRoundId: number,
): Promise<{ sqrtRootSum: number; uniqueDonorsCount: number }> {
  const result = await AppDataSource.getDataSource().query(
    `
      SELECT "sqrtRootSum", "uniqueDonorsCount"
      FROM project_estimated_matching_view
      WHERE "projectId" = $1 AND "qfRoundId" = $2;
    `,
    [projectId, qfRoundId],
  );

  return {
    sqrtRootSum: result[0] ? result[0].sqrtRootSum : 0,
    uniqueDonorsCount: result[0] ? Number(result[0].uniqueDonorsCount) : 0,
  };
}

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
