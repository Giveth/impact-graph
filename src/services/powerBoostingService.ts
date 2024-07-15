import {
  cancelProjectBoosting,
  findPowerBoostings,
} from '../repositories/powerBoostingRepository.js';

export const changeUserBoostingsAfterProjectCancelled = async (params: {
  projectId: number;
}) => {
  const { projectId } = params;
  const [powerBoostings] = await findPowerBoostings({
    orderBy: { direction: 'DESC', field: 'createdAt' },
    projectId,
  });
  powerBoostings.forEach(powerBoosting =>
    cancelProjectBoosting({
      userId: powerBoosting.userId,
      projectId,
    }),
  );
};
