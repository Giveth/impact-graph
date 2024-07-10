import { Project } from '../entities/project';
import { ProjectUpdate } from '../entities/project';
import { logger } from '../utils/logger';

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
