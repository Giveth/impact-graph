import { Project } from '../entities/project';

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

/**
 * Custom Query Builders to chain together
 */

// @Field(_type => Float, { nullable: true })
// async sumDonationValueUsdForActiveQfRound() {
//   const activeQfRound = this.getActiveQfRound();
//   return activeQfRound
//     ? await sumDonationValueUsdForQfRound({
//         projectId: this.id,
//         qfRoundId: activeQfRound.id,
//       })
//     : 0;
// }

// @Field(_type => Float, { nullable: true })
// async sumDonationValueUsd() {
//   return await sumDonationValueUsd(this.id);
// }

// @Field(_type => Int, { nullable: true })
// async countUniqueDonorsForActiveQfRound() {
//   const activeQfRound = this.getActiveQfRound();
//   return activeQfRound
//     ? await countUniqueDonorsForRound({
//         projectId: this.id,
//         qfRoundId: activeQfRound.id,
//       })
//     : 0;
// }

// @Field(_type => Int, { nullable: true })
// async countUniqueDonors() {
//   return await countUniqueDonors(this.id);
// }

// export const updateProjectStatistics = async (projectId: number) => {
//   // const project = await Project.findOne(projectId);
//   // if (!project) return;
//   // project.sumDonationValueUsdForActiveQfRound = await calculateSumDonationValueUsdForActiveQfRound(projectId);
//   // project.sumDonationValueUsd = await calculateSumDonationValueUsd(projectId);
//   // project.countUniqueDonorsForActiveQfRound = await calculateCountUniqueDonorsForActiveQfRound(projectId);
//   // project.countUniqueDonors = await calculateCountUniqueDonors(projectId);
//   // await project.save();
// };

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
