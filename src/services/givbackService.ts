import { getPowerRound } from '../repositories/powerRoundRepository';
import {
  findProjectGivbackRankViewByProjectId,
  getBottomGivbackRank,
} from '../repositories/projectGivbackViewRepository';

export const calculateGivbackFactor = async (
  projectId: number,
): Promise<{
  givbackFactor: number;
  bottomRankInRound: number;
  projectRank?: number;
  powerRound: number;
}> => {
  const minGivFactor = Number(process.env.GIVBACK_MIN_FACTOR);
  const maxGivFactor = Number(process.env.GIVBACK_MAX_FACTOR);
  const [projectGivbackRankView, bottomRank, powerRound] = await Promise.all([
    findProjectGivbackRankViewByProjectId(projectId),
    getBottomGivbackRank(),
    getPowerRound(),
  ]);

  const eachRoundImpact = (maxGivFactor - minGivFactor) / (bottomRank - 1);
  const givbackFactor = projectGivbackRankView?.powerRank
    ? minGivFactor +
      eachRoundImpact * (bottomRank - projectGivbackRankView?.powerRank)
    : minGivFactor;

  return {
    givbackFactor: givbackFactor || 0,
    projectRank: projectGivbackRankView?.powerRank,
    bottomRankInRound: bottomRank,
    powerRound: powerRound?.round as number,
  };
};
