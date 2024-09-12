import { logger } from '../utils/logger';
import { AppDataSource } from '../orm';
import { ProjectGivbackRankView } from '../entities/ProjectGivbackRankView';

export const refreshProjectGivbackRankView = async (): Promise<void> => {
  logger.debug('Refresh project_givback_rank_view materialized view');
  try {
    return AppDataSource.getDataSource().query(
      `
        REFRESH MATERIALIZED VIEW CONCURRENTLY project_givback_rank_view
      `,
    );
  } catch (e) {
    logger.error('refreshProjectGivbackRankView() error', e);
  }
};

export const getBottomGivbackRank = async (): Promise<number> => {
  try {
    const powerRank = await AppDataSource.getDataSource().query(`
        SELECT MAX("powerRank") FROM project_givback_rank_view
    `);
    return Number(powerRank[0].max);
  } catch (e) {
    logger.error('getBottomGivbackRank error', e);
    throw new Error('Error in getting last power rank');
  }
};

export const findProjectGivbackRankViewByProjectId = async (
  projectId: number,
): Promise<ProjectGivbackRankView | null> => {
  return ProjectGivbackRankView.findOne({ where: { projectId } });
};
