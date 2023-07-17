import { QfRound } from '../entities/qfRound';
import { AppDataSource } from '../orm';

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
  contributorsCount: number;
}> => {
  const query = `
    SELECT
      SUM("sqrtRootSumSquared") as "sum",
      SUM("donorsCount") as "contributorsCount"
    FROM project_estimated_matching_view
    WHERE "qfRoundId" = $1;
  `;

  const result = await AppDataSource.getDataSource().query(query, [qfRoundId]);

  const sum = result[0]?.sum || 0;
  const contributorsCount = parseInt(result[0]?.contributorsCount, 10) || 0;

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
