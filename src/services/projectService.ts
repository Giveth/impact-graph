import { Project } from '../entities/project';
import {
  countUniqueDonorsAndSumDonationValueUsd,
  countUniqueDonorsForRound,
  sumDonationValueUsdForQfRound,
} from '../repositories/donationRepository';
import { findProjectById } from '../repositories/projectRepository';

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
  const project = await findProjectById(projectId);
  if (!project) return;

  const activeQfRound = project.getActiveQfRound();
  if (activeQfRound) {
    project.sumDonationValueUsdForActiveQfRound =
      await sumDonationValueUsdForQfRound({
        projectId: project.id,
        qfRoundId: activeQfRound.id,
      });
    project.countUniqueDonorsForActiveQfRound = await countUniqueDonorsForRound(
      {
        projectId: project.id,
        qfRoundId: activeQfRound.id,
      },
    );
  }

  if (!activeQfRound) {
    project.sumDonationValueUsdForActiveQfRound = 0;
    project.countUniqueDonorsForActiveQfRound = 0;
  }

  const { totalDonations, uniqueDonors } =
    await countUniqueDonorsAndSumDonationValueUsd(project.id);

  project.sumDonationValueUsd = totalDonations;
  project.countUniqueDonors = uniqueDonors;
  await project.save();
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
