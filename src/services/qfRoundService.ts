import { findProjectById } from '../repositories/projectRepository';
import { QfRound } from '../entities/qfRound';

export const relatedActiveQfRoundForProject = async (
  projectId: number,
): Promise<QfRound | null> => {
  const project = await findProjectById(projectId);
  if (!project) {
    return null;
  }
  const now = new Date();
  const qfRound = project?.qfRounds.find(
    qr => qr.isActive && qr.beginDate <= now && now <= qr.endDate,
  );

  if (!qfRound) {
    return null;
  }
  return qfRound;
};

export const isQfRoundHasEnded = (params: { endDate: Date }): boolean => {
  return new Date() >= params.endDate;
};
