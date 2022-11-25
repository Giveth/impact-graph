import {
  findProjectPowerViewByProjectId,
  getBottomRank,
} from '../repositories/projectPowerViewRepository';

export const calculateGivbackFactor = async (
  projectId: number,
): Promise<number> => {
  const minGivFactor = Number(process.env.GIVBACK_MIN_FACTOR);
  const maxGivFactor = Number(process.env.GIVBACK_MAX_FACTOR);
  const [projectPowerView, bottomRank] = await Promise.all([
    findProjectPowerViewByProjectId(projectId),
    getBottomRank(),
  ]);

  const eachRoundImpact = (maxGivFactor - minGivFactor) / (bottomRank - 1);
  return projectPowerView?.powerRank
    ? minGivFactor +
        eachRoundImpact * (bottomRank - projectPowerView?.powerRank)
    : minGivFactor;
};
