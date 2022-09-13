import { getConnection } from 'typeorm';
import { ProjectPowerView } from '../views/projectPowerView';

export const getProjectPowers = async (
  take: number = 50,
  skip: number = 0,
): Promise<ProjectPowerView[]> => {
  return ProjectPowerView.find({ take, skip });
};

export const refreshProjectPowerView = async (): Promise<void> => {
  return getConnection().manager.query(
    `
      REFRESH MATERIALIZED VIEW project_power_view
    `,
  );
};
