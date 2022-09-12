import { UserProjectPowerView } from '../views/userProjectPowerView';
import { getConnection } from 'typeorm';

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
  const query = UserProjectPowerView.createQueryBuilder('userProjectPower')
    // select some parameters of project and user not all fields
    // .leftJoinAndSelect(
    //   'userProjectPower.project',
    //   'project',
    //   'userProjectPower."projectId" = project.id',
    // )
    // .leftJoin(
    //   'userProjectPower.user',
    //   'user',
    //   'userProjectPower."userId" = user.id',
    // )
    // .addSelect(publicSelectionFields)
    .where(`"boostedPower" > 0`);

  if (params.userId) {
    query.andWhere(`"userId" =${params.userId}`);
  }
  if (params.projectId) {
    query.andWhere(`"projectId" =${params.projectId}`);
  }
  return query
    .orderBy(
      `userProjectPower.${params.orderBy.field}`,
      params.orderBy.direction,
    )
    .take(params.take)
    .skip(params.skip)
    .getManyAndCount();
};

export const refreshUserProjectPowerView = async (): Promise<void> => {
  return getConnection().manager.query(
    `
      REFRESH MATERIALIZED VIEW user_project_power_view
    `,
  );
};
