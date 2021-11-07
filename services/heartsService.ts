import { Donation } from '../entities/donation';
import { Project } from '../entities/project';
import { Reaction } from '../entities/reaction';

export const updateTotalHeartsOfAProject = async (projectId: number) => {
  try {
    const totalHearts = await Reaction.count({
      projectId,
      reaction: 'heart',
    });
    await Project.update(
      { id: projectId },
      {
        totalHearts,
      },
    );
  } catch (e) {
    console.log('updateTotalHeartsOfAProject error', e);
  }
};
