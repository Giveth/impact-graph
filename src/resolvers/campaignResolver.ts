import {
  Arg,
  Ctx,
  Field,
  Int,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import {
  Campaign,
  CampaignFilterField,
  CampaignSortingField,
} from '../entities/campaign';
import {
  findAllActiveCampaigns,
  findCampaignBySlug,
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

@Resolver(of => Campaign)
export class CampaignResolver {
  @Query(returns => [Campaign], { nullable: true })
  async campaigns(
    @Ctx() { req: { user }, projectsFiltersThreadPool }: ApolloContext,
    @Arg('connectedWalletUserId', { nullable: true })
    connectedWalletUserId?: number,
  ) {
    const userId = connectedWalletUserId || user?.userId;
    const campaigns = await findAllActiveCampaigns();
    return Promise.all(
      campaigns?.map(campaign => fillCampaignProjects({ campaign, userId })),
    );
  }

  @Query(returns => Campaign, { nullable: true })
  async findCampaignBySlug(
    @Arg('slug') slug: string,
    @Ctx()
    { req: { user }, projectsFiltersThreadPool }: ApolloContext,
    @Arg('connectedWalletUserId', { nullable: true })
    connectedWalletUserId?: number,
    @Arg('skip', type => Int, { nullable: true }) skip?: number,
    @Arg('limit', type => Int, { nullable: true }) limit?: number,
  ) {
    const campaign = await findCampaignBySlug(slug);
    if (!campaign) {
      throw new Error(errorMessages.CAMPAIGN_NOT_FOUND);
    }
    const userId = connectedWalletUserId || user?.userId;
    return fillCampaignProjects({ campaign, userId, skip, limit });
  }
}
