import { Project } from '../entities/project';
import { ProjectUpdate } from '../entities/project';
import { logger } from '../utils/logger';

export const updateTotalProjectUpdatesOfAProject = async (
  projectId: number,
) => {
  try {
    const totalProjectUpdates = await ProjectUpdate.count({
      where: { projectId, isMain: false },
    });
    await Project.update(
      { id: projectId },
      {
        totalProjectUpdates,
        updatedAt: () => '"updatedAt"',
      },
    );
  } catch (e) {
    logger.error('updateTotalProjectUpdatesOfAProject error', e);
  }
};
