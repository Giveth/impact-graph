import { Project } from '../entities/project.js';
import { ProjectUpdate } from '../entities/project.js';
import { logger } from '../utils/logger.js';

export const updateProjectUpdatesStatistics = async (projectId: number) => {
  try {
    const totalProjectUpdates = await ProjectUpdate.count({
      where: { projectId, isMain: false },
    });
    const { latestUpdateCreationDate } = await ProjectUpdate.createQueryBuilder(
      'projectUpdate',
    )
      .select('MAX(projectUpdate.createdAt)', 'latestUpdateCreationDate')
      .where('projectUpdate.projectId = :projectId', { projectId })
      .getRawOne();
    await Project.update(
      { id: projectId },
      {
        totalProjectUpdates,
        latestUpdateCreationDate,
      },
    );
  } catch (e) {
    logger.error('updateProjectUpdatesStatistics error', e);
  }
};
