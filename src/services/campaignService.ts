import { Campaign, CampaignType } from '../entities/campaign';
import {
  filterProjectsQuery,
  findProjectBySlug,
  findProjectsBySlugArray,
} from '../repositories/projectRepository';
import { FilterField, Project, SortingField } from '../entities/project';
import { findUserReactionsByProjectIds } from '../repositories/reactionRepository';
import { ModuleThread, Pool } from 'threads';
import { ProjectResolverWorker } from '../workers/projectsResolverWorker';

const projectFiltersCacheDuration =
  Number(process.env.PROJECT_FILTERS_THREADS_POOL_DURATION) || 60000;

export const fillCampaignProjects = async (params: {
  userId?: number;
  campaign: Campaign;
  skip?: number;
  limit?: number;
  projectsFiltersThreadPool: Pool<ModuleThread<ProjectResolverWorker>>;
}): Promise<Campaign> => {
  const { campaign, userId, projectsFiltersThreadPool } = params;
  let projects: Project[] = [];
  let projectsQuery;
  const limit = params.limit || 10;
  const skip = params.skip || 0;
  let totalCount = 0;

  // TODO Add caching for fetch projects
  if (campaign.type === CampaignType.RelatedProjects) {
    projects = await findProjectsBySlugArray(campaign.relatedProjectsSlugs);
    totalCount = projects.length;
  } else if (campaign.type === CampaignType.FilterFields) {
    projectsQuery = filterProjectsQuery({
      limit,
      skip,
      filters: campaign.filterFields as unknown as FilterField[],
    });
    const projectsQueryCacheKey = await projectsFiltersThreadPool.queue(
      hasher =>
        hasher.hashProjectFilters({
          limit,
          skip,
          filters: campaign.filterFields as unknown as FilterField[],
          suffix: 'cq',
        }),
    );
    [projects, totalCount] = await projectsQuery
      .cache(projectsQueryCacheKey, projectFiltersCacheDuration)
      .getManyAndCount();
  } else if (campaign.type === CampaignType.SortField) {
    projectsQuery = filterProjectsQuery({
      limit,
      skip,
      sortingBy: campaign.sortingField as unknown as SortingField,
    });
    const projectsQueryCacheKey = await projectsFiltersThreadPool.queue(
      hasher =>
        hasher.hashProjectFilters({
          limit,
          skip,
          sortingBy: campaign.sortingField as unknown as SortingField,
          suffix: 'cq',
        }),
    );
    [projects, totalCount] = await projectsQuery
      .cache(projectsQueryCacheKey, projectFiltersCacheDuration)
      .getManyAndCount();
  } else if (campaign.type === CampaignType.WithoutProjects) {
    // Dont add projects to this campaign type
  }

  if (userId) {
    const userReactions = await findUserReactionsByProjectIds(
      userId,
      projects.map(project => project.id),
    );
    projects = projects.map(project => {
      project.reaction = userReactions.find(
        reaction => reaction.projectId === project.id,
      );
      return project;
    });
  }
  campaign.relatedProjects = projects;
  campaign.relatedProjectsCount = totalCount;
  return campaign;
};
