import {
  findProjectPowerViewByProjectId,
  getBottomRank,
} from '../repositories/projectPowerViewRepository.js';
import { getPowerRound } from '../repositories/powerRoundRepository.js';

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
  const [projectPowerView, bottomRank, powerRound] = await Promise.all([
    findProjectPowerViewByProjectId(projectId),
    getBottomRank(),
    getPowerRound(),
  ]);

  const eachRoundImpact = (maxGivFactor - minGivFactor) / (bottomRank - 1);
  const givbackFactor = projectPowerView?.powerRank
    ? minGivFactor +
      eachRoundImpact * (bottomRank - projectPowerView?.powerRank)
    : minGivFactor;

  return {
    givbackFactor: givbackFactor || 0,
    projectRank: projectPowerView?.powerRank,
    bottomRankInRound: bottomRank,
    powerRound: powerRound?.round as number,
  };
};
