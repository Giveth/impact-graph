import { Project } from '../entities/project';
import { Reaction } from '../entities/reaction';
import { logger } from '../utils/logger';

export const updateTotalReactionsOfAProject = async (projectId: number) => {
  try {
    const totalReactions = await Reaction.count({
      projectId,
      reaction: 'heart',
    });
    await Project.update(
      { id: projectId },
      {
        totalReactions,
        updatedAt: () => '"updatedAt"',
      },
    );
  } catch (e) {
    logger.error('updateTotalReactionsOfAProject error', e);
  }
};
