import { Campaign } from '../entities/campaign';
import { findProjectBySlug } from './projectRepository';
import { errorMessages } from '../utils/errorMessages';

export const findAllActiveCampaigns = async (): Promise<Campaign[]> => {
  // TODO Write raw SQL query
  return Campaign.createQueryBuilder('campaign')
    .leftJoinAndSelect('campaign.relatedProjects', 'relatedProjects')
    .where('campaign.isActive = :isActive', {
      isActive: true,
    })
    .orderBy('campaign.order', 'ASC')
    .addOrderBy('campaign.id', 'DESC')
    .getMany();
};

export const fillRelatedProjectsOfACampaign = async (campaignId: number) => {
  const campaign = await findCampaignById(campaignId);
  if (!campaign) {
    throw new Error(errorMessages.CAMPAIGN_NOT_FOUND);
  }
  campaign.relatedProjects = [];
  for (const slug of campaign.relatedProjectsSlugs) {
    const project = await findProjectBySlug(slug);
    if (project) {
      campaign.relatedProjects.push(project);
    }
  }
  await campaign.save();
};

export const findCampaignById = async (
  campaignId: number,
): Promise<Campaign | null> => {
  return Campaign.findOne({
    where: {
      id: campaignId,
    },
  });
};
