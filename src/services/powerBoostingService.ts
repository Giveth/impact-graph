import {
  findPowerBoostings,
  setSingleBoosting,
} from '../repositories/powerBoostingRepository';

export const changeUserBoostingsAfterProjectCancelled = async (params: {
  projectId: number;
}) => {
  const { projectId } = params;
  const [powerBoostings] = await findPowerBoostings({
    orderBy: { direction: 'DESC', field: 'createdAt' },
    projectId,
  });
  powerBoostings.forEach(powerBoosting =>
    setSingleBoosting({
      userId: powerBoosting.userId,
      projectId,
      percentage: 0,
    }),
  );
};
