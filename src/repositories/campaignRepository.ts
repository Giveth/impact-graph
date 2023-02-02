import { Campaign } from '../entities/campaign';

export const findAllActiveCampaigns = async (): Promise<Campaign[]> => {
  return Campaign.createQueryBuilder('campaign')
    .leftJoin('campaign.relatedProjects', 'projects')
    .where('campaign.isActive = :isActive', {
      isActive: true,
    })
    .orderBy('campaign.order', 'DESC')
    .addOrderBy('campaign.id', 'DESC')
    .getMany();
};
