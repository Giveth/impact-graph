import { Project } from '../entities/project';
import { ProjectUpdate } from '../entities/project';

export const updateTotalProjectUpdatesOfAProject = async (
  projectId: number,
) => {
  try {
    const totalProjectUpdates = await ProjectUpdate.count({
      where: { projectId, isMain: false },
    });
    await Project.createQueryBuilder('project')
      .update<Project>(Project, { totalProjectUpdates })
      .where('project.id = :projectId', { projectId })
      .updateEntity(true)
      .execute();
  } catch (e) {
    console.log('updateTotalProjectUpdatesOfAProject error', e);
  }
};
