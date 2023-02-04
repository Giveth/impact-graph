import { Query, registerEnumType, Resolver } from 'type-graphql';
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
import { findAllActiveCampaigns } from '../repositories/campaignRepository';
import { FilterField, SortingField } from '../entities/project';

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
  async campaigns() {
    return findAllActiveCampaigns();
  }
}
