import { Project } from '../entities/project';
import { ProjectQfRound } from '../entities/projectQfRound';
import {
  countUniqueDonorsAndSumDonationValueUsd,
  getProjectQfRoundStats,
} from '../repositories/donationRepository';
import { findQfRoundById } from '../repositories/qfRoundRepository';

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

export const updateProjectStatistics = async (
  projectId: number,
  qfRoundId?: number,
) => {
  let activeQfRound;
  if (qfRoundId) {
    activeQfRound = await findQfRoundById(qfRoundId);
  }

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

  // Update Project entity with overall stats
  await Project.update(projectId, {
    totalDonations,
    countUniqueDonors: uniqueDonors,
    totalRaised: totalDonations,
    sumDonationValueUsdForActiveQfRound,
    countUniqueDonorsForActiveQfRound,
  });

  // Update or create ProjectQfRound entity with QF round specific stats
  if (activeQfRound) {
    const existingProjectQfRound = await ProjectQfRound.findOne({
      where: {
        projectId,
        qfRoundId: activeQfRound.id,
      },
    });

    if (existingProjectQfRound) {
      // Update existing record
      await ProjectQfRound.update(
        {
          projectId,
          qfRoundId: activeQfRound.id,
        },
        {
          sumDonationValueUsd: sumDonationValueUsdForActiveQfRound,
          countUniqueDonors: countUniqueDonorsForActiveQfRound,
        },
      );
    }
  }
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
