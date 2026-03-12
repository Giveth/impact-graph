import { getPowerRound } from '../repositories/powerRoundRepository';
import {
  findProjectGivbackRankViewByProjectId,
  getBottomGivbackRank,
} from '../repositories/projectGivbackViewRepository';

export const calculateGivbackFactorByRank = (params: {
  projectRank?: number;
  bottomRank: number;
  minGivFactor: number;
  maxGivFactor: number;
}): number => {
  const { projectRank, bottomRank, minGivFactor, maxGivFactor } = params;

  // Keep configured bounds stable even if env values are swapped.
  const minFactor = Math.min(minGivFactor, maxGivFactor);
  const maxFactor = Math.max(minGivFactor, maxGivFactor);

  // With no ranking spread (or invalid bottom rank), avoid division by zero.
  // If project has a rank (rank 1 in this case), keep top project on max factor.
  if (!Number.isFinite(bottomRank) || bottomRank <= 1) {
    return Number.isFinite(projectRank) && (projectRank as number) > 0
      ? maxFactor
      : minFactor;
  }

  // When rank is missing/invalid, default to bottom rank -> minimum factor.
  const normalizedRank =
    Number.isFinite(projectRank) && (projectRank as number) > 0
      ? (projectRank as number)
      : bottomRank;

  const step = (maxFactor - minFactor) / (bottomRank - 1);
  const rawFactor = maxFactor - (normalizedRank - 1) * step;
  const boundedFactor = Math.max(minFactor, Math.min(maxFactor, rawFactor));
  return Number.isFinite(boundedFactor) ? boundedFactor : minFactor;
};

export const calculateGivbackFactor = async (
  projectId: number,
): Promise<{
  givbackFactor: number;
  bottomRankInRound: number;
  projectRank?: number;
  powerRound: number;
}> => {
  const minGivFactorRaw = Number(process.env.GIVBACK_MIN_FACTOR);
  const maxGivFactorRaw = Number(process.env.GIVBACK_MAX_FACTOR);
  const minGivFactor = Number.isFinite(minGivFactorRaw) ? minGivFactorRaw : 0;
  const maxGivFactor = Number.isFinite(maxGivFactorRaw)
    ? maxGivFactorRaw
    : minGivFactor;

  const [projectGivbackRankView, bottomRank, powerRound] = await Promise.all([
    findProjectGivbackRankViewByProjectId(projectId),
    getBottomGivbackRank(),
    getPowerRound(),
  ]);

  const givbackFactor = calculateGivbackFactorByRank({
    projectRank: projectGivbackRankView?.powerRank,
    bottomRank,
    minGivFactor,
    maxGivFactor,
  });

  return {
    givbackFactor,
    projectRank: projectGivbackRankView?.powerRank,
    bottomRankInRound:
      Number.isFinite(bottomRank) && bottomRank > 0 ? bottomRank : 1,
    powerRound: powerRound?.round as number,
  };
};
