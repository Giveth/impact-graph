import { UserProjectPowerView } from '../views/userProjectPowerView';
import { getConnection } from 'typeorm';

export const getUserProjectPowers = async (
  projectId: number,
  take: number = 50,
  skip: number = 0,
): Promise<UserProjectPowerView[]> => {
  return getConnection().manager.find(UserProjectPowerView, {
    where: { projectId },
    take,
    skip,
  });
};

export const refreshUserProjectPowerView = async (): Promise<void> => {
  return getConnection().manager.query(
    `
      REFRESH MATERIALIZED VIEW user_project_power_view
    `,
  );
};
