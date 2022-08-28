import { PowerBoosting } from '../entities/powerBoosting';
import { Project } from '../entities/project';
import { User } from '../entities/user';
import { getConnection } from 'typeorm';
import { logger } from '../utils/logger';
import { errorMessages } from '../utils/errorMessages';
import { findProjectById } from './projectRepository';
import { findUserById } from './userRepository';
import { GetPowerBoostingArgs } from '../resolvers/givPowerResolver';

export const findUserPowerBoosting = async (
  userId: number,
): Promise<PowerBoosting[]> => {
  return PowerBoosting.createQueryBuilder('powerBoosting')
    .leftJoinAndSelect('powerBoosting.project', 'project')
    .leftJoinAndSelect('powerBoosting.user', 'user')
    .where(`"userId" =${userId}`)
    .andWhere(`percentage > 0`)
    .getMany();
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
    .leftJoinAndSelect('powerBoosting.user', 'user')
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

export const setMultipleBoosting = async (params: {
  userId: number;
  projectIds: number[];
  percentages: number[];
}): Promise<PowerBoosting[]> => {
  const { userId, projectIds, percentages } = params;
  const queryRunner = getConnection().createQueryRunner();

  await queryRunner.connect();

  await queryRunner.startTransaction();
  try {
    await queryRunner.manager.query(
      `
            UPDATE power_boosting
            SET percentage=0
            WHERE "userId" = ${userId}
         `,
    );
    const user = await findUserById(userId);
    for (let i = 0; i < projectIds.length; i++) {
      // TODO we can optimize this query
      const project = await findProjectById(projectIds[i]);
      await queryRunner.manager.save(PowerBoosting, {
        user,
        project,
        percentage: percentages[i],
      });
    }

    // commit transaction now:
    await queryRunner.commitTransaction();
    return findUserPowerBoosting(userId);
  } catch (e) {
    logger.error('setMultipleBoosting error', e);

    // since we have errors let's rollback changes we made
    await queryRunner.rollbackTransaction();
    throw Error(errorMessages.SOMETHING_WENT_WRONG);
  } finally {
    // you need to release query runner which is manually created:
    await queryRunner.release();
  }
};
