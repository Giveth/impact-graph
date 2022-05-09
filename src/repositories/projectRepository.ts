import { Project } from '../entities/project';

export const findProjectById = (
  projectId: number,
): Promise<Project | undefined> => {
  return Project.findOne({ id: projectId });
};
