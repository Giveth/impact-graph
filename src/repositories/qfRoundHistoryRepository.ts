import { AppDataSource } from '../orm';
import { QfRoundHistory } from '../entities/qfRoundHistory';
import { logger } from '../utils/logger';

export const fillQfRoundHistory = async (): Promise<void> => {
  try {
    logger.debug('fillQfRoundHistory() has been called');
    await AppDataSource.getDataSource().query(`
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
          d.status = 'verified'
        GROUP BY d."projectId", d."qfRoundId"
        ON CONFLICT ("projectId", "qfRoundId") DO NOTHING;
  `);
    logger.debug('fillQfRoundHistory() query executed successfully');
  } catch (e) {
    logger.error('fillQfRoundHistory() error: ', e);
  }
};

export const getQfRoundHistory = async (params: {
  projectId: number;
  qfRoundId: number;
}): Promise<QfRoundHistory | null> => {
  const { projectId, qfRoundId } = params;
  return QfRoundHistory.findOne({ where: { projectId, qfRoundId } });
};

export const getQfRoundHistoryMatchingValueUsd = async (
  projectId: number,
): Promise<number> => {
  try {
    logger.debug('Executing query to fetch matching fund values');
    const result = await QfRoundHistory.createQueryBuilder('q')
      .select('COALESCE(SUM(q."matchingFundPriceUsd"),0)', 'total')
      .where('q.projectId = :projectId', { projectId })
      .getRawOne();

    return result.total;
  } catch (e) {
    logger.error('Error in getQfRoundHistoryMatchingValueUsd', e);
    throw e;
  }
};

export const getQfRoundHistoriesThatDontHaveRelatedDonations =
  async (): Promise<QfRoundHistory[]> => {
    try {
      return QfRoundHistory.createQueryBuilder('q')
        .innerJoin('qf_round', 'qr', 'qr.id = q.qfRoundId')
        .innerJoin('project', 'p', 'p.id = q.projectId')
        .leftJoin(
          'donation',
          'd',
          'q.distributedFundTxHash = d.transactionId AND q.projectId = d.projectId AND d.distributedFundQfRoundId IS NOT NULL',
        )
        .where('d.id IS NULL')
        .andWhere('q.matchingFund IS NOT NULL')
        .andWhere('q.matchingFund != 0')
        .andWhere('q.distributedFundTxHash IS NOT NULL')
        .andWhere('q.distributedFundNetwork IS NOT NULL')
        .andWhere('q.matchingFundCurrency IS NOT NULL')
        .andWhere('q.matchingFundAmount IS NOT NULL')
        .getMany();
    } catch (e) {
      logger.error('getQfRoundHistoriesThatDontHaveRelatedDonations error', e);
      throw e;
    }
  };
