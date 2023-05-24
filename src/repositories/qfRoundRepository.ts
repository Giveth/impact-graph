import { QfRound } from '../entities/qfRound';
import { ProjectAddress } from '../entities/projectAddress';
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
) => {
  const result = await AppDataSource.getDataSource().query(
    `
    select coalesce(sum("donationSqrtRoot"), 0) as "sqrtRootSum" from
        (select sqrt(coalesce("valueUsd", 0)) as "donationSqrtRoot", "projectId" from donation
            where "projectId" = $1 and "qfRoundId" = $2) as "donations"
--     group by "projectId"
  `,
    [projectId, qfRoundId],
  );

  return result[0].sqrtRootSum;
};
