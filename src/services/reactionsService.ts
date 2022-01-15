import { Project } from '../entities/project';
import { Reaction } from '../entities/reaction';

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
      },
    );
  } catch (e) {
    console.log('updateTotalReactionsOfAProject error', e);
  }
};
