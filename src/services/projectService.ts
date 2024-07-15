import { Project } from '../entities/project.js';
import {
  countUniqueDonorsAndSumDonationValueUsd,
  getProjectQfRoundStats,
} from '../repositories/donationRepository.js';
import { findActiveQfRound } from '../repositories/qfRoundRepository.js';

export const getAppropriateSlug = async (
  slugBase: string,
  projectId?: number,
): Promise<string> => {
  if (!slugBase) throw new Error('slugBase is required');
  let slug = slugBase.toLowerCase();
  const query = Project.createQueryBuilder('project')
    // check current slug and previous slugs
    .where(`:slug = ANY(project."slugHistory") or project.slug = :slug`, {
      slug,
    });
  if (projectId) {
    query.andWhere(`id != ${projectId}`);
  }
  const projectCount = await query.getCount();

  if (projectCount > 0) {
    slug = slug + '-' + (projectCount - 1);
  }
  return slug;
};

export const updateProjectStatistics = async (projectId: number) => {
  const activeQfRound = await findActiveQfRound();
  let sumDonationValueUsdForActiveQfRound = 0,
    countUniqueDonorsForActiveQfRound = 0;
  if (activeQfRound) {
    const qfRoundResult = await getProjectQfRoundStats({
      projectId,
      qfRound: activeQfRound,
    });
    sumDonationValueUsdForActiveQfRound = qfRoundResult.sumValueUsd;
    countUniqueDonorsForActiveQfRound = qfRoundResult.uniqueDonorsCount;
  }

  const { totalDonations, uniqueDonors } =
    await countUniqueDonorsAndSumDonationValueUsd(projectId);

  await Project.update(projectId, {
    totalDonations,
    countUniqueDonors: uniqueDonors,
    sumDonationValueUsdForActiveQfRound,
    countUniqueDonorsForActiveQfRound,
  });
};

// Current Formula: will be changed possibly in the future
export const getQualityScore = (description, hasImageUpload, heartCount?) => {
  const heartScore = 10;
  let qualityScore = 40;

  if (Number(description?.length) > 100) qualityScore = qualityScore + 10;
  if (hasImageUpload) qualityScore = qualityScore + 30;

  if (heartCount) {
    qualityScore = heartCount * heartScore;
  }
  return qualityScore;
};
