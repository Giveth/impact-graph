import { UserProjectPowerView } from '../views/userProjectPowerView';
import { publicSelectionFields } from '../entities/user';
import { logger } from '../utils/logger';
import { UserPowerOrderBy } from '../resolvers/userProjectPowerResolver';
import { AppDataSource } from '../orm';

export const getUserProjectPowers = async (params: {
  take: number;
  skip: number;
  orderBy: UserPowerOrderBy;
  userId?: number;
  projectId?: number;
  round?: number;
}): Promise<[UserProjectPowerView[], number]> => {
  try {
    const query = UserProjectPowerView.createQueryBuilder('userProjectPower')
      .leftJoin('userProjectPower.user', 'user')
      .addSelect(publicSelectionFields)
      .addSelect(
        'RANK () OVER (ORDER BY "boostedPower" DESC)',
        'userProjectPower_rank',
      )
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
    if (params.round) {
      query.andWhere(`"round" = :round`, {
        round: params.round,
      });
    }
    return await query
      .orderBy(
        `userProjectPower.${params.orderBy.field}`,
        params.orderBy.direction,
      )
      .limit(params.take)
      .offset(params.skip)
      .getManyAndCount();
    // return [await query.getMany(), await query.getCount()]
  } catch (e) {
    logger.error('getUserProjectPowers error', e);
    throw e;
  }
};

export const refreshUserProjectPowerView = async (): Promise<void> => {
  logger.debug('Refresh user_project_power_view materialized view');
  return AppDataSource.getDataSource().query(
    `
      REFRESH MATERIALIZED VIEW CONCURRENTLY user_project_power_view
    `,
  );
};
