import { Project } from '../entities/project';
import { QfRound } from '../entities/qfRound';
import { findActiveQfRound } from '../repositories/qfRoundRepository';

export const relatedActiveQfRoundForProject = async (
  projectId: number,
): Promise<QfRound | null> => {
  // const project = await findProjectById(projectId);
  // if (!project) {
  //   return null;
  // }
  // const now = new Date();
  // const qfRound = project?.qfRounds.find(
  //   qr => qr.isActive && qr.beginDate <= now && now <= qr.endDate,
  // );

  // if (!qfRound) {
  //   return null;
  // }

  const projectExists = await Project.exists({ where: { id: projectId } });
  if (!projectExists) {
    return null;
  }

  const qfRound = await findActiveQfRound();

  return qfRound;
};

export const isQfRoundHasEnded = (params: { endDate: Date }): boolean => {
  return new Date() >= params.endDate;
};
