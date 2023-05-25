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
    .select('coalesce(sum("donationSqrtRoot"), 0)', 'sqrtRootSum')
    .addSelect('count(*)', 'count')
    .from(subQuery1 => {
      return subQuery1
        .select('sqrt("valueUsd")', 'donationSqrtRoot')
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
        }, 'donationsGroupByUser');
    }, 'donations')
    .groupBy()
    .cache(`pr-dn-sqrt-sum-${projectId}-${qfRoundId}`, 60000)
    .getRawOne();
  return {
    sqrtRootSum: result.sqrtRootSum ? parseFloat(result.sqrtRootSum) : 0,
    count: result.count ? parseInt(result.count, 10) : 0,
  };
};
//
// export const getQfRoundTotalProjectsDonationsSum = async (
//   qfRoundId: number,
// ) => {};
