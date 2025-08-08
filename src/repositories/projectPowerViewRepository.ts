import { Not, MoreThan } from 'typeorm';
import { FindOneOptions } from 'typeorm/find-options/FindOneOptions';
import axios from 'axios';
import { ProjectPowerView } from '../views/projectPowerView';
import { ProjectFuturePowerView } from '../views/projectFuturePowerView';
import { logger } from '../utils/logger';
import { updatePowerSnapshotSyncedFlag } from './powerSnapshotRepository';
import { LastSnapshotProjectPowerView } from '../views/lastSnapshotProjectPowerView';
import { AppDataSource } from '../orm';
import { findPowerBoostings } from './powerBoostingRepository';
import { Project } from '../entities/project';

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
  try {
    return AppDataSource.getDataSource().query(
      `
        REFRESH MATERIALIZED VIEW CONCURRENTLY project_power_view
      `,
    );
  } catch (e) {
    logger.error('refreshProjectPowerView() error', e);
  }
};

export const refreshProjectFuturePowerView = async (
  updateSyncedFlag: boolean = true,
): Promise<void> => {
  try {
    if (updateSyncedFlag) {
      const numberNewSyncedSnapshots = await updatePowerSnapshotSyncedFlag();
      if (numberNewSyncedSnapshots > 0) {
        logger.debug(
          'Refresh last_snapshot_project_power_view materialized view',
        );
        await AppDataSource.getDataSource().query(
          `
        REFRESH MATERIALIZED VIEW CONCURRENTLY last_snapshot_project_power_view
      `,
        );
      }
    }

    logger.debug('Refresh project_future_power_view materialized view');
    return AppDataSource.getDataSource().query(
      `
        REFRESH MATERIALIZED VIEW CONCURRENTLY project_future_power_view
      `,
    );
  } catch (e) {
    logger.error('refreshProjectFuturePowerView()', e);
  }
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

  const project = await Project.findOneOrFail({ where: { id: projectId } });

  const qb = LastSnapshotProjectPowerView.createQueryBuilder('view')
    .innerJoin('project', 'p', 'p.id = view.projectId')
    .where('view.totalPower > :powerAmount', { powerAmount })
    .andWhere('p.projectType = :projectType', {
      projectType: project.projectType,
    })
    .andWhere('view.projectId != :projectId', { projectId })
    .orderBy('view.totalPower', 'ASC')
    .select(['view.powerRank'])
    .limit(1);

  const aboveProject = await qb.getOne();

  return aboveProject ? +aboveProject.powerRank + 1 : 1; // There is not any other project
};

// Calculate real-time power amount similar to frontend logic
export const getPowerAmount = async (projectId: number): Promise<number> => {
  const [powerBoostings] = await findPowerBoostings({
    projectId,
    orderBy: {
      field: 'percentage',
      direction: 'DESC',
    },
  });

  const walletAddresses = powerBoostings
    .map(pb => pb.user?.walletAddress)
    .filter(
      (address): address is string => typeof address === 'string' && !!address,
    )
    .map(address => address.toLowerCase());

  if (walletAddresses.length === 0) return 0;

  const unipoolContractId = process.env.GIV_POWER_UNIPOOL_CONTRACT_ID;
  if (!unipoolContractId) {
    logger.error(
      'GIV_POWER_UNIPOOL_CONTRACT_ID environment variable is not set',
    );
    return 0;
  }
  const query = getPowerBalanceQuery({
    addresses: new Set(walletAddresses),
    unipoolContractId,
  });

  const response = await axios.post(process.env.GIV_POWER_SUBGRAPH_URL!, {
    query,
  });
  const data = response.data?.data;

  if (!data || !data.unipoolBalances) {
    logger.error('Missing unipoolBalances in response:', response.data);
    return 0;
  }

  const balanceMap: { [wallet: string]: number } = {};
  for (const entry of data.unipoolBalances) {
    const wallet = entry.user.id.toLowerCase();
    balanceMap[wallet] = Number(entry.balance);
  }

  let totalAllocated = 0;
  for (const pb of powerBoostings) {
    const wallet = pb.user?.walletAddress?.toLowerCase();
    const balance = wallet ? balanceMap[wallet] || 0 : 0;
    const allocated = (balance * pb.percentage) / 100;
    totalAllocated += allocated;
  }

  return Number((totalAllocated / 1e18).toFixed(2));
};

const getPowerBalanceQuery = (params: {
  addresses: Set<string>;
  unipoolContractId: string;
}): string => {
  const { addresses, unipoolContractId } = params;

  const usersIn =
    '[' +
    Array.from(addresses)
      .map(address => `"${address.toLowerCase()}"`)
      .join(',') +
    ']';

  return `query {
    unipoolBalances(
      first: ${addresses.size}
      where: {
        unipool: "${unipoolContractId.toLowerCase()}",
        user_in: ${usersIn}
      }
    ) {
      balance
      updatedAt
      user {
        id
      }
    }
  }`;
};
