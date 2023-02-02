import { Query, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';

import { User } from '../entities/user';
import { Category } from '../entities/category';
import { MainCategory } from '../entities/mainCategory';
import { AppDataSource } from '../orm';
import { Campaign } from '../entities/campaign';
import { findAllActiveCampaigns } from '../repositories/campaignRepository';

@Resolver(of => Campaign)
export class CampaignResolver {
  @Query(returns => [Campaign], { nullable: true })
  async campaigns() {
    return findAllActiveCampaigns();
  }
}
