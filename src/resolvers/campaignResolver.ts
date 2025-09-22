import { Arg, Ctx, Int, Query, registerEnumType, Resolver } from 'type-graphql';
import {
  Campaign,
  CampaignFilterField,
  CampaignSortingField,
} from '../entities/campaign';
import {
  findAllActiveCampaigns,
  findCampaignBySlug,
  findFeaturedCampaign,
} from '../repositories/campaignRepository';
import { ApolloContext } from '../types/ApolloContext';
import { errorMessages } from '../utils/errorMessages';
import { fillCampaignProjects } from '../services/campaignService';

registerEnumType(CampaignSortingField, {
  name: 'CampaignSortingField',
  description: 'Same sorting fields like projects',
});

registerEnumType(CampaignFilterField, {
  name: 'CampaignFilterField',
  description: 'Same filter fields like projects',
});

@Resolver(_of => Campaign)
export class CampaignResolver {
  @Query(_returns => [Campaign], { nullable: true })
  async campaigns(
    @Ctx() { req: { user }, projectsFiltersThreadPool }: ApolloContext,
    @Arg('connectedWalletUserId', _type => Int, { nullable: true })
    connectedWalletUserId?: number,
  ) {
    const userId = connectedWalletUserId || user?.userId;
    const campaigns = await findAllActiveCampaigns();

    if (!campaigns || campaigns.length === 0) {
      return campaigns;
    }

    // Optimize: Process campaigns in parallel with better error handling
    const campaignPromises = campaigns.map(campaign =>
      fillCampaignProjects({ campaign, userId, projectsFiltersThreadPool }),
    );

    return Promise.all(campaignPromises);
  }

  @Query(_returns => Campaign, { nullable: true })
  async findCampaignBySlug(
    @Ctx()
    { req: { user }, projectsFiltersThreadPool }: ApolloContext,
    @Arg('connectedWalletUserId', _type => Int, { nullable: true })
    connectedWalletUserId?: number,
    // If user dont send slug, we return first featured campaign
    @Arg('slug', { nullable: true }) slug?: string,
  ) {
    let campaign: Campaign | null;
    if (slug) {
      campaign = await findCampaignBySlug(slug);
      if (!campaign) {
        throw new Error(errorMessages.CAMPAIGN_NOT_FOUND);
      }
    } else {
      campaign = await findFeaturedCampaign();
      if (!campaign) {
        throw new Error(errorMessages.THERE_IS_NOT_ANY_FEATURED_CAMPAIGN);
      }
    }

    const userId = connectedWalletUserId || user?.userId;
    return fillCampaignProjects({
      campaign,
      userId,
      projectsFiltersThreadPool,
    });
  }
}
