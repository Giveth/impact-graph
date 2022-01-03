import { Project } from '../entities/project';
import { ProjectUpdate } from '../entities/project';

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
    console.log('updateTotalProjectUpdatesOfAProject error', e);
  }
};
