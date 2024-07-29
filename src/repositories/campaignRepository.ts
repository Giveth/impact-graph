import { Campaign } from '../entities/campaign.js';

export const findAllActiveCampaigns = async (): Promise<Campaign[]> => {
  return Campaign.createQueryBuilder('campaign')
    .where('campaign.isActive = :isActive', {
      isActive: true,
    })
    .orderBy('campaign.order', 'ASC')
    .addOrderBy('campaign.id', 'DESC')
    .getMany();
};

export const findCampaignBySlug = async (
  slug: string,
): Promise<Campaign | null> => {
  return Campaign.createQueryBuilder('campaign')
    .where('campaign.slug = :slug', {
      slug,
    })
    .andWhere('campaign.isActive = :isActive', {
      isActive: true,
    })
    .getOne();
};

export const findFeaturedCampaign = async (): Promise<Campaign | null> => {
  return Campaign.createQueryBuilder('campaign')
    .where('campaign."isFeatured" = true')
    .andWhere('campaign.isActive = :isActive', {
      isActive: true,
    })
    .getOne();
};
