import { QfRound } from '../entities/qfRound';
import { AppDataSource } from '../orm';

const qfRoundEstimatedMatchingParamsCacheDuration = Number(
  process.env.QF_ROUND_ESTIMATED_MATCHING_CACHE_DURATION || 60000,
);

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
export const findQfRoundById = async (id: number): Promise<QfRound | null> => {
  return QfRound.createQueryBuilder('qf_round').where(`id = ${id}`).getOne();
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
  contributorsCount: number;
}> => {
  const query = `
    SELECT
      SUM("sqrtRootSumSquared") as "sum",
      SUM("donorsCount") as "contributorsCount"
    FROM project_estimated_matching_view
    WHERE "qfRoundId" = $1;
  `;

  const result = await AppDataSource.getDataSource()
    .createQueryBuilder()
    .select(`SUM("sqrtRootSumSquared")`, 'sum')
    .addSelect(`SUM("donorsCount")`, 'contributorsCount')
    .from('project_estimated_matching_view', 'project_estimated_matching_view')
    .where('"qfRoundId" = :qfRoundId', { qfRoundId })
    // Add cache here
    .cache(
      'qfRoundTotalProjectsDonationsSum_' + qfRoundId,
      qfRoundEstimatedMatchingParamsCacheDuration,
    )
    .getRawOne();

  const sum = result?.sum || 0;
  const contributorsCount = parseInt(result?.contributorsCount, 10) || 0;

  return {
    sum,
    contributorsCount,
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
