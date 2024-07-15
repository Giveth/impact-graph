import { Project } from '../entities/project.js';
import { ProjectUpdate } from '../entities/project.js';
import { logger } from '../utils/logger.js';

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
      },
    );
  } catch (e) {
    logger.error('updateTotalProjectUpdatesOfAProject error', e);
  }
};
