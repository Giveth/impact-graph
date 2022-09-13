import { UserProjectPowerView } from '../views/userProjectPowerView';
import { getConnection } from 'typeorm';
import { publicSelectionFields } from '../entities/user';
import { logger } from '../utils/logger';

export const getUserProjectPowers = async (params: {
  take: number;
  skip: number;
  orderBy: {
    field:
      | 'createdAt'
      | 'updatedAt'
      | 'percentage'
      | 'boostedPower'
      | 'userPower';
    direction: 'ASC' | 'DESC';
  };
  userId?: number;
  projectId?: number;
}): Promise<[UserProjectPowerView[], number]> => {
  try {
    const query = UserProjectPowerView.createQueryBuilder('userProjectPower')
      .leftJoin('userProjectPower.user', 'user')
      .addSelect(publicSelectionFields)
      .where(`"boostedPower" > 0`);

    if (params.userId) {
      query.andWhere(`"userId" =:userId`, {
        userId: params.userId,
      });
    }
    if (params.projectId) {
      query.andWhere(`"projectId" =:projectId`, {
        projectId: params.projectId,
      });
    }
    return await query
      .orderBy(
        `userProjectPower.${params.orderBy.field}`,
        params.orderBy.direction,
      )
      .take(params.take)
      .skip(params.skip)
      .getManyAndCount();
    // return [await query.getMany(), await query.getCount()]
  } catch (e) {
    logger.error('getUserProjectPowers error', e);
    throw e;
  }
};

export const refreshUserProjectPowerView = async (): Promise<void> => {
  return getConnection().manager.query(
    `
      REFRESH MATERIALIZED VIEW user_project_power_view
    `,
  );
};
