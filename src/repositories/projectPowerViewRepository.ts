import { Not, MoreThan } from 'typeorm';
import { ProjectPowerView } from '../views/projectPowerView';
import { ProjectFuturePowerView } from '../views/projectFuturePowerView';
import { logger } from '../utils/logger';
import { updatePowerSnapshotSyncedFlag } from './powerSnapshotRepository';
import { LastSnapshotProjectPowerView } from '../views/lastSnapshotProjectPowerView';
import { FindOneOptions } from 'typeorm/find-options/FindOneOptions';
import { AppDataSource } from '../orm';

export const getProjectPowers = async (
  take: number = 50,
  skip: number = 0,
): Promise<ProjectPowerView[]> => {
  return ProjectPowerView.find({ take, skip });
};

export const findProjectsPowers = async (
  projectIds: number[] = [],
  round?: number,
  take: number = 100,
  skip: number = 0,
): Promise<[ProjectPowerView[], number]> => {
  const query = ProjectPowerView.createQueryBuilder(
    'projectPowerView',
  ).leftJoinAndSelect('projectPowerView.project', 'project');

  if (projectIds.length > 0 && round) {
    query
      .where('projectPowerView.projectId IN (:...projectIds)', { projectIds })
      .andWhere('projectPowerView.round = :round', { round });
  } else if (projectIds.length === 0 && round) {
    query.where('projectPowerView.round = :round', { round });
  } else if (projectIds.length > 0 && !round) {
    query.where('projectPowerView.projectId IN (:...projectIds)', {
      projectIds,
    });
  }

  return query.take(take).skip(skip).getManyAndCount();
};

export const findProjectPowerViewByProjectId = async (
  projectId: number,
): Promise<ProjectPowerView | null> => {
  return ProjectPowerView.findOne({ where: { projectId } });
};

export const getProjectFuturePowers = async (
  take: number = 50,
  skip: number = 0,
): Promise<ProjectPowerView[]> => {
  return ProjectFuturePowerView.find({ take, skip });
};

export const getBottomRank = async (): Promise<number> => {
  try {
    const powerRank = await AppDataSource.getDataSource().query(`
        SELECT MAX("powerRank") FROM project_power_view
    `);
    return Number(powerRank[0].max);
  } catch (e) {
    logger.error('getTopPowerRank error', e);
    throw new Error('Error in getting last power rank');
  }
};

export const refreshProjectPowerView = async (): Promise<void> => {
  logger.debug('Refresh project_power_view materialized view');
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_power_view
    `,
  );
};

export const refreshProjectFuturePowerView = async (
  updateSyncedFlag: boolean = true,
): Promise<void> => {
  if (updateSyncedFlag) {
    const numberNewSyncedSnapshots = await updatePowerSnapshotSyncedFlag();
    if (numberNewSyncedSnapshots > 0) {
      logger.debug(
        'Refresh last_snapshot_project_power_view materialized view',
      );
      await AppDataSource.getDataSource().query(
        `
      REFRESH MATERIALIZED VIEW last_snapshot_project_power_view
    `,
      );
    }
  }

  logger.debug('Refresh project_future_power_view materialized view');
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW project_future_power_view
    `,
  );
};

// Return position of a project with powerAmount in the power ranking list
export const getPowerAmountRank = async (
  powerAmount: number,
  projectId?: number,
): Promise<number> => {
  if (powerAmount < 0) throw new Error('Power Amount cannot be zero');

  const where: FindOneOptions['where'] = {
    totalPower: MoreThan(powerAmount),
  };

  if (projectId !== undefined) {
    where.projectId = Not(projectId);
  }

  const [aboveProject] = await LastSnapshotProjectPowerView.find({
    where,
    select: ['powerRank'],
    order: {
      totalPower: 'ASC',
    },
    take: 1,
  });

  return aboveProject ? +aboveProject.powerRank + 1 : 1; // There is not any other project
};
