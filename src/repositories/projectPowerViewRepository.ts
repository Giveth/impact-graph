import { getConnection } from 'typeorm';
import { ProjectPowerView } from '../views/projectPowerView';
import { ProjectFuturePowerView } from '../views/projectFuturePowerView';
import { logger } from '../utils/logger';

export const getProjectPowers = async (
  take: number = 50,
  skip: number = 0,
): Promise<ProjectPowerView[]> => {
  return ProjectPowerView.find({ take, skip });
};

export const findProjectPowerViewByProjectId = async (
  projectId: number,
): Promise<ProjectPowerView | undefined> => {
  return ProjectPowerView.findOne(projectId);
};

export const getProjectFuturePowers = async (
  take: number = 50,
  skip: number = 0,
): Promise<ProjectPowerView[]> => {
  return ProjectFuturePowerView.find({ take, skip });
};

export const getBottomRank = async (): Promise<number> => {
  try {
    const powerRank = await getConnection().manager.query(`
        SELECT MAX("powerRank") FROM project_power_view
    `);
    return Number(powerRank[0].max);
  } catch (e) {
    logger.error('getTopPowerRank error', e);
    throw new Error('Error in getting last power rank');
  }
};

export const refreshProjectPowerView = async (): Promise<void> => {
  return getConnection().manager.query(
    `
      REFRESH MATERIALIZED VIEW project_power_view
    `,
  );
};

export const refreshProjectFuturePowerView = async (): Promise<void> => {
  return getConnection().manager.query(
    `
      REFRESH MATERIALIZED VIEW project_future_power_view
    `,
  );
};
