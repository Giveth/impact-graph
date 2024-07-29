import { Project } from '../entities/project.js';
import { Reaction } from '../entities/reaction.js';
import { logger } from '../utils/logger.js';

export const updateTotalReactionsOfAProject = async (projectId: number) => {
  try {
    const totalReactions = await Reaction.count({
      where: {
        projectId,
        reaction: 'heart',
      },
    });
    await Project.update(
      { id: projectId },
      {
        totalReactions,
      },
    );
  } catch (e) {
    logger.error('updateTotalReactionsOfAProject error', e);
  }
};
