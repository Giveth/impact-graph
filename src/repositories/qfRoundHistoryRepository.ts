import { AppDataSource } from '../orm';
import { QfRoundHistory } from '../entities/qfRoundHistory';
import { logger } from '../utils/logger';

export const fillQfRoundHistory = async (): Promise<void> => {
  logger.info('fillQfRoundHistory() has been called');
  return AppDataSource.getDataSource().query(`
      INSERT INTO qf_round_history ("projectId", "qfRoundId", "uniqueDonors", "raisedFundInUsd", "donationsCount", "createdAt", "updatedAt")
      SELECT 
        d."projectId",
        d."qfRoundId",
        COUNT(DISTINCT d."userId") as "uniqueDonors",
        SUM(d."valueUsd") as "raisedFundInUsd",
        COUNT(d.id) as "donationsCount",
        NOW() as "createdAt",
        NOW() as "updatedAt"
      FROM donation d
      INNER JOIN qf_round qr ON qr.id = d."qfRoundId"
      INNER JOIN public.user u ON u.id = d."userId" 
      WHERE 
        qr."isActive" = false AND
        qr."endDate" < NOW() AND
        u."passportScore" >= qr."minimumPassportScore" AND
        d.status = 'verified'
      GROUP BY d."projectId", d."qfRoundId"
      ON CONFLICT ("projectId", "qfRoundId") DO NOTHING;

`);
};

export const getQfRoundHistory = async (params: {
  projectId: number;
  qfRoundId: number;
}): Promise<QfRoundHistory | null> => {
  const { projectId, qfRoundId } = params;
  return QfRoundHistory.findOne({ where: { projectId, qfRoundId } });
};
