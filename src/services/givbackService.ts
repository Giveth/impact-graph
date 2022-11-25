import {
  findProjectPowerViewByProjectId,
  getBottomRank,
} from '../repositories/projectPowerViewRepository';

export const calculateGivbackFactor = async (
  projectId: number,
): Promise<{
  givbackFactor: number;
  bottomRankInRound: number;
  projectRank?: number;
}> => {
  const minGivFactor = Number(process.env.GIVBACK_MIN_FACTOR);
  const maxGivFactor = Number(process.env.GIVBACK_MAX_FACTOR);
  const [projectPowerView, bottomRank] = await Promise.all([
    findProjectPowerViewByProjectId(projectId),
    getBottomRank(),
  ]);

  const eachRoundImpact = (maxGivFactor - minGivFactor) / (bottomRank - 1);
  const givbackFactor = projectPowerView?.powerRank
    ? minGivFactor +
      eachRoundImpact * (bottomRank - projectPowerView?.powerRank)
    : minGivFactor;
  return {
    givbackFactor,
    projectRank: projectPowerView?.powerRank,
    bottomRankInRound: bottomRank,
  };
};
