import { Brackets } from 'typeorm';
import { PowerBoosting } from '../entities/powerBoosting';
import { Project } from '../entities/project';
import { publicSelectionFields, User } from '../entities/user';
import { logger } from '../utils/logger';
import {
  errorMessages,
  i18n,
  translationErrorMessagesKeys,
} from '../utils/errorMessages';
import { PowerSnapshot } from '../entities/powerSnapshot';
import { getRoundNumberByDate } from '../utils/powerBoostingUtils';
import { getKeyByValue } from '../utils/utils';
import { PowerBoostingSnapshot } from '../entities/powerBoostingSnapshot';
import { AppDataSource } from '../orm';

const MAX_PROJECT_BOOST_LIMIT = Number(
  process.env.GIVPOWER_BOOSTING_USER_PROJECTS_LIMIT || '20',
);
const PERCENTAGE_PRECISION = Number(
  process.env.GIVPOWER_BOOSTING_PERCENTAGE_PRECISION || '2',
);

const formatPercentage = (p: number): number => {
  return +p.toFixed(PERCENTAGE_PRECISION);
};

export const findUserPowerBoostings = async (
  userId?: number,
  projectId?: number,
  take?: number,
  skip?: number,
  forceProjectIds?: number[],
): Promise<[PowerBoosting[], number]> => {
  const query = PowerBoosting.createQueryBuilder('powerBoosting')
    .leftJoinAndSelect('powerBoosting.project', 'project')
    .leftJoinAndSelect('powerBoosting.user', 'user');

  if (userId) {
    query.where(`powerBoosting.userId = :userId`, { userId });
  }

  if (projectId) {
    query.where('powerBoosting.projectId = :projectId', { projectId });
  }

  if (!forceProjectIds || forceProjectIds.length === 0) {
    query.andWhere(`percentage > 0`);
  } else {
    query.andWhere(
      new Brackets(qb =>
        qb
          .where('percentage > 0')
          .orWhere(`powerBoosting.projectId IN (:...forceProjectIds)`, {
            forceProjectIds,
          }),
      ),
    );
  }
  return query.take(take).skip(skip).getManyAndCount();
};

export const findUserProjectPowerBoostingsSnapshots = async (
  userId?: number,
  projectId?: number,
  take?: number,
  skip?: number,
  powerSnapshotId?: number,
  round?: number,
) => {
  const query = PowerBoostingSnapshot.createQueryBuilder('powerBoosting')
    .leftJoinAndSelect('powerBoosting.powerSnapshot', 'powerSnapshot')
    .where(`percentage > 0`);

  if (userId) {
    query.andWhere(`powerBoosting.userId = :userId`, { userId });
  }

  if (projectId) {
    query.andWhere('powerBoosting.projectId = :projectId', { projectId });
  }

  if (round) {
    query.andWhere('powerSnapshot.roundNumber = :round', { round });
  }

  if (powerSnapshotId) {
    query.andWhere('powerBoosting.powerSnapshotId = :powerSnapshotId', {
      powerSnapshotId,
    });
  }

  return query.take(take).skip(skip).getManyAndCount();
};

export const findUserPowerBoosting = async (
  userId: number,
  forceProjectIds?: number[],
): Promise<PowerBoosting[]> => {
  const query = PowerBoosting.createQueryBuilder('powerBoosting')
    .leftJoinAndSelect('powerBoosting.project', 'project')
    .leftJoinAndSelect('powerBoosting.user', 'user')
    .where(`"userId" =${userId}`);

  if (!forceProjectIds || forceProjectIds.length === 0) {
    return query.andWhere(`percentage > 0`).getMany();
  } else {
    return query
      .andWhere(
        new Brackets(qb =>
          qb
            .where('percentage > 0')
            .orWhere(`powerBoosting.projectId IN (:...forceProjectIds)`, {
              forceProjectIds,
            }),
        ),
      )
      .getMany();
  }
};

export const findPowerBoostings = async (params: {
  take?: number;
  skip?: number;
  orderBy: {
    field: 'createdAt' | 'updatedAt' | 'percentage';
    direction: 'ASC' | 'DESC';
  };
  userId?: number;
  projectId?: number;
}): Promise<[PowerBoosting[], number]> => {
  const query = PowerBoosting.createQueryBuilder('powerBoosting')
    // select some parameters of project and user not all fields
    .leftJoinAndSelect('powerBoosting.project', 'project')
    .leftJoin('powerBoosting.user', 'user')
    .addSelect(publicSelectionFields)
    .where(`percentage > 0`);

  if (params.userId) {
    query.andWhere(`"userId" =${params.userId}`);
  }
  if (params.projectId) {
    query.andWhere(`"projectId" =${params.projectId}`);
  }
  query.orderBy(
    `powerBoosting.${params.orderBy.field}`,
    params.orderBy.direction,
  );

  if (params.take) {
    query.take(params.take);
  }
  if (params.skip) {
    query.skip(params.skip);
  }
  return query.getManyAndCount();
};

export const findPowerBoostingsCountByUserId = async (
  userId: number,
): Promise<number> => {
  const query = PowerBoosting.createQueryBuilder('powerBoosting')
    // select some parameters of project and user not all fields
    .leftJoinAndSelect('powerBoosting.project', 'project')
    .leftJoin('powerBoosting.user', 'user')
    .addSelect(publicSelectionFields)
    .where(`percentage > 0`)
    .andWhere(`"userId" =${userId}`)
    .cache(
      `findPowerBoostingsCountByUserId-recurring-${userId}`,
      Number(process.env.USER_STATS_CACHE_TIME || 60000),
    );
  return query.getCount();
};

export const insertSinglePowerBoosting = async (params: {
  user: User;
  project: Project;
  percentage: number;
}): Promise<PowerBoosting> => {
  return PowerBoosting.create({
    user: params.user,
    project: params.project,
    percentage: params.percentage,
  }).save();
};

export const cancelProjectBoosting = async (params: {
  userId: number;
  projectId: number;
}): Promise<PowerBoosting[]> =>
  _setSingleBoosting({
    ...params,
    percentage: 0,
    projectIsCanceled: true,
  });

export const setSingleBoosting = async (params: {
  userId: number;
  projectId: number;
  percentage: number;
}): Promise<PowerBoosting[]> =>
  _setSingleBoosting({ ...params, projectIsCanceled: false });

const _setSingleBoosting = async (params: {
  userId: number;
  projectId: number;
  percentage: number;
  projectIsCanceled: boolean;
}): Promise<PowerBoosting[]> => {
  const { userId, projectId, percentage, projectIsCanceled } = params;

  if (percentage < 0 || percentage > 100) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
      ),
    );
  }

  const queryRunner = AppDataSource.getDataSource().createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  let result: PowerBoosting[] = [];

  try {
    const userPowerBoostings = await findUserPowerBoosting(userId, [projectId]);

    const otherProjectsPowerBoostings = userPowerBoostings.filter(
      pb => +pb.projectId !== projectId,
    );

    // The power boosting corresponding to <userId, projectId> pair
    let projectBoost = userPowerBoostings.find(
      pb => +pb.projectId === projectId,
    );

    const commitData: PowerBoosting[] = [];

    if (otherProjectsPowerBoostings.length === 0) {
      if (percentage !== 100 && !projectIsCanceled)
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT,
          ),
        );
    } else {
      if (
        otherProjectsPowerBoostings.length + 1 > MAX_PROJECT_BOOST_LIMIT &&
        percentage !== 100
      ) {
        throw new Error(
          i18n.__(
            translationErrorMessagesKeys.ERROR_GIVPOWER_BOOSTING_MAX_PROJECT_LIMIT,
          ),
        );
      }

      const otherProjectsCurrentTotalPercentages =
        otherProjectsPowerBoostings.reduce(
          (_sum, pb) => _sum + pb.percentage,
          0,
        );
      const otherProjectsAfterTotalPercentages = 100 - percentage;

      otherProjectsPowerBoostings.forEach(_pb => {
        _pb.percentage = formatPercentage(
          (_pb.percentage * otherProjectsAfterTotalPercentages) /
            otherProjectsCurrentTotalPercentages,
        );
        commitData.push(_pb);
      });
    }

    if (projectBoost) {
      projectBoost.percentage = percentage;
    } else {
      projectBoost = PowerBoosting.create({
        userId,
        projectId,
        percentage,
      });
    }

    commitData.push(projectBoost);

    await queryRunner.manager.save(commitData);

    await queryRunner.commitTransaction();

    result = await findUserPowerBoosting(userId);
  } catch (e) {
    logger.error('setSingleBoosting error', e);

    // since we have errors let's rollback changes we made
    await queryRunner.rollbackTransaction();
    const errorKey = getKeyByValue(errorMessages, e.message);
    if (errorKey)
      throw new Error(i18n.__(translationErrorMessagesKeys[errorKey]));
    else
      throw Error(i18n.__(translationErrorMessagesKeys.SOMETHING_WENT_WRONG));
  } finally {
    await queryRunner.release();
  }
  return result;
};

export const setMultipleBoosting = async (params: {
  userId: number;
  projectIds: number[];
  percentages: number[];
}): Promise<PowerBoosting[]> => {
  const { userId, projectIds, percentages } = params;

  if (percentages.length > MAX_PROJECT_BOOST_LIMIT) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.ERROR_GIVPOWER_BOOSTING_MAX_PROJECT_LIMIT,
      ),
    );
  }

  if (
    percentages.length === 0 ||
    percentages.length !== projectIds.length ||
    new Set(projectIds).size !== projectIds.length ||
    percentages.some(percentage => percentage < 0 || percentage > 100)
  ) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
      ),
    );
  }

  const total: number = percentages.reduce(
    (_sum, _percentage) => _sum + _percentage,
    0,
  );

  // Sometimes js add some tiny numbers at the end of number for instance if you
  // calculate 50.46+18+12.62+9.46+9.46 with calculator you would get 100 but with js you will get
  // 100.00000000000003 so we have to ignore small different changes in this webservice
  const MAX_TOTAL_PERCENTAGES = 100.00001;
  if (
    total < 100 - 0.01 * percentages.length ||
    total > MAX_TOTAL_PERCENTAGES
  ) {
    throw new Error(
      i18n.__(
        translationErrorMessagesKeys.ERROR_GIVPOWER_BOOSTING_INVALID_DATA,
      ),
    );
  }

  const map = new Map<number, number>(
    projectIds.map((projectId, index) => [projectId, percentages[index]]),
  );

  const queryRunner = AppDataSource.getDataSource().createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  let result: PowerBoosting[] = [];

  try {
    const userPowerBoostings = await findUserPowerBoosting(userId, projectIds);
    userPowerBoostings.forEach(pb => {
      const projectId = +pb.projectId;
      if (map.has(projectId)) {
        pb.percentage = map.get(projectId) as number;
        map.delete(projectId);
      } else {
        pb.percentage = 0;
      }
    });
    for (const [projectId, percentage] of map.entries()) {
      userPowerBoostings.push(
        PowerBoosting.create({ userId, projectId, percentage }),
      );
    }
    await queryRunner.manager.save(userPowerBoostings);

    await queryRunner.commitTransaction();

    result = await findUserPowerBoosting(userId);
  } catch (e) {
    logger.error('setSingleBoosting error', e);

    // since we have errors let's rollback changes we made
    await queryRunner.rollbackTransaction();
    const errorKey = getKeyByValue(errorMessages, e.message);
    if (errorKey)
      throw new Error(i18n.__(translationErrorMessagesKeys[errorKey]));
    else
      throw Error(i18n.__(translationErrorMessagesKeys.SOMETHING_WENT_WRONG));
  } finally {
    await queryRunner.release();
  }
  return result;
};

export const takePowerBoostingSnapshot = async () => {
  await AppDataSource.getDataSource().query(
    'CALL public."TAKE_POWER_BOOSTING_SNAPSHOT"()',
  );
};

export const getPowerBoostingSnapshotRound = (
  snapshot: PowerSnapshot,
): number => {
  return getRoundNumberByDate(snapshot.time).round;
};

export const getBoosterUsersByWalletAddresses = async (
  addressesLowercase: string[],
): Promise<Pick<User, 'id' | 'walletAddress'>[]> => {
  if (addressesLowercase.length === 0) return [];
  // Return users has boosted projects and their wallet addresses are in addresses array
  return await User.createQueryBuilder('user')
    .where('LOWER(user.walletAddress) IN (:...addresses)', {
      addresses: addressesLowercase,
    })
    .andWhereExists(
      PowerBoosting.createQueryBuilder('pb').where('pb.userId = user.id'),
    )
    .getMany();
};
