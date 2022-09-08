import { PowerBoosting } from '../entities/powerBoosting';
import { Project } from '../entities/project';
import { publicSelectionFields, User } from '../entities/user';
import { Brackets, getConnection } from 'typeorm';
import { logger } from '../utils/logger';
import { errorMessages } from '../utils/errorMessages';

const MAX_PROJECT_BOOST_LIMIT = Number(
  process.env.GIVPOWER_BOOSTING_USER_PROJECTS_LIMIT || '20',
);
const PERCENTAGE_PRECISION = Number(
  process.env.GIVPOWER_BOOSTING_PERCENTAGE_PRECISION || '2',
);

const formatPercentage = (p: number): number => {
  const multiplier = Math.pow(10, PERCENTAGE_PRECISION);
  return Math.ceil(p * multiplier) / multiplier;
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
  take: number;
  skip: number;
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
  return query
    .orderBy(`powerBoosting.${params.orderBy.field}`, params.orderBy.direction)
    .take(params.take)
    .skip(params.skip)
    .getManyAndCount();
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

export const setSingleBoosting = async (params: {
  userId: number;
  projectId: number;
  percentage: number;
}): Promise<PowerBoosting[]> => {
  const { userId, projectId, percentage } = params;

  if (percentage < 0 || percentage > 100) {
    throw new Error(errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA);
  }

  const queryRunner = getConnection().createQueryRunner();
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
      if (percentage !== 100)
        throw new Error(
          errorMessages.ERROR_GIVPOWER_BOOSTING_FIRST_PROJECT_100_PERCENT,
        );
    } else {
      if (
        otherProjectsPowerBoostings.length + 1 > MAX_PROJECT_BOOST_LIMIT &&
        percentage !== 100
      ) {
        throw new Error(
          errorMessages.ERROR_GIVPOWER_BOOSTING_MAX_PROJECT_LIMIT,
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
    if (Object.values(errorMessages).includes(e.message)) throw e;
    else throw Error(errorMessages.SOMETHING_WENT_WRONG);
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
    throw new Error(errorMessages.ERROR_GIVPOWER_BOOSTING_MAX_PROJECT_LIMIT);
  }

  if (
    percentages.length === 0 ||
    percentages.length !== projectIds.length ||
    new Set(projectIds).size !== projectIds.length ||
    percentages.some(percentage => percentage < 0 || percentage > 100)
  ) {
    throw new Error(errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA);
  }

  const total: number = percentages.reduce(
    (_sum, _percentage) => _sum + _percentage,
    0,
  );

  if (total < 100 - 0.01 * percentages.length || total > 100) {
    throw new Error(errorMessages.ERROR_GIVPOWER_BOOSTING_INVALID_DATA);
  }

  const map = new Map<number, number>(
    projectIds.map((projectId, index) => [projectId, percentages[index]]),
  );

  const queryRunner = getConnection().createQueryRunner();
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
    if (Object.values(errorMessages).includes(e.message)) throw e;
    else throw Error(errorMessages.SOMETHING_WENT_WRONG);
  } finally {
    await queryRunner.release();
  }
  return result;
};
