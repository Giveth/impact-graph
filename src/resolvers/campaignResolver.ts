import {
  Arg,
  Ctx,
  Field,
  Int,
  Query,
  registerEnumType,
  Resolver,
} from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user';
import { Category } from '../entities/category';
import { MainCategory } from '../entities/mainCategory';
import { AppDataSource } from '../orm';
import {
  Campaign,
  CampaignFilterField,
  CampaignSortingField,
} from '../entities/campaign';
import {
  findAllActiveCampaigns,
  findCampaignBySlug,
} from '../repositories/campaignRepository';
import { FilterField, SortingField } from '../entities/project';
import { ApolloContext } from '../types/ApolloContext';
import { errorMessages } from '../utils/errorMessages';

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
  // @Arg('connectedWalletUserId') connectedWalletUserId: number,
  // @Ctx() { req: { user }, projectsFiltersThreadPool }: ApolloContext,
  async campaigns() {
    // const userId = connectedWalletUserId || user?.userId;
    const campaigns = await findAllActiveCampaigns();
    // return Promise.all(
    //   campaigns.map(campaign => fillCampaignProjects({ campaign, userId })),
    // );
    return campaigns;
  }

  @Query(returns => Campaign, { nullable: true })
  async findCampaignBySlug(
    @Arg('slug') slug: string,
    @Arg('connectedWalletUserId') connectedWalletUserId: number,
    @Ctx() { req: { user }, projectsFiltersThreadPool }: ApolloContext,
  ) {
    const campaign = await findCampaignBySlug(slug);
    if (!campaign) {
      throw new Error(errorMessages.CAMPAIGN_NOT_FOUND);
    }
    const userId = connectedWalletUserId || user?.userId;
    // return fillCampaignProjects({ campaign, userId });
    return campaign;
  }
}
