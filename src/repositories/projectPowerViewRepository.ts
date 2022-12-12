import { getConnection, LessThanOrEqual, MoreThan } from 'typeorm';
import { ProjectPowerView } from '../views/projectPowerView';
import { ProjectFuturePowerView } from '../views/projectFuturePowerView';
import { logger } from '../utils/logger';
import { updatePowerSnapshotSyncedFlag } from './powerSnapshotRepository';

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

export const refreshProjectFuturePowerView = async (
  updateSyncedFlag: boolean = true,
): Promise<void> => {
  if (updateSyncedFlag) await updatePowerSnapshotSyncedFlag();

  return getConnection().manager.query(
    `
      REFRESH MATERIALIZED VIEW project_future_power_view
    `,
  );
};

// Return position of a project with powerAmount in the power ranking list
export const getPowerAmountRank = async (
  powerAmount: number,
): Promise<number> => {
  if (powerAmount < 0) throw new Error('Power Amount cannot be zero');

  const [belowProject] = await ProjectPowerView.find({
    where: {
      totalPower: LessThanOrEqual(powerAmount),
    },
    select: ['powerRank'],
    order: {
      totalPower: 'DESC',
    },
    take: 1,
  });

  // There is no project, or all the projects are above that!
  if (!belowProject) {
    const [aboveProject] = await ProjectPowerView.find({
      where: {
        totalPower: MoreThan(powerAmount),
      },
      select: ['powerRank'],
      order: {
        totalPower: 'ASC',
      },
      take: 1,
    });

    if (aboveProject) {
      return aboveProject.powerRank + 1;
    } else return 1; // There is not any other project
  } else {
    return belowProject.powerRank;
  }
};
