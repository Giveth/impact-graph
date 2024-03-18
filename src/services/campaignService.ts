import { ModuleThread, Pool } from 'threads';
import { Campaign, CampaignType } from '../entities/campaign';
import {
  FilterProjectQueryInputParams,
  filterProjectsQuery,
} from '../repositories/projectRepository';
import { FilterField, Project, SortingField } from '../entities/project';
import { findUserReactionsByProjectIds } from '../repositories/reactionRepository';
import { ProjectResolverWorker } from '../workers/projectsResolverWorker';
import { findAllActiveCampaigns } from '../repositories/campaignRepository';
import { logger } from '../utils/logger';
import { getRedisObject, setObjectInRedis } from '../redis';

const projectFiltersCacheDuration =
  Number(process.env.PROJECT_FILTERS_THREADS_POOL_DURATION) || 60000;

const createFetchCampaignProjectsQuery = (
  campaign: Campaign,
): FilterProjectQueryInputParams | null => {
  const limit = 10;
  const skip = 0;
  const projectsQueryParams: FilterProjectQueryInputParams = {
    limit,
    skip,
  };

  if (campaign.type === CampaignType.ManuallySelected) {
    projectsQueryParams.slugArray = campaign.relatedProjectsSlugs;
    // In this case we should fetch all projects
    projectsQueryParams.limit = 100;
  } else if (campaign.type === CampaignType.FilterFields) {
    projectsQueryParams.filters =
      campaign.filterFields as unknown as FilterField[];
  } else if (campaign.type === CampaignType.SortField) {
    projectsQueryParams.sortingBy =
      campaign.sortingField as unknown as SortingField;
  } else if (campaign.type === CampaignType.WithoutProjects) {
    // Dont add projects to this campaign type
    return null;
  }

  return projectsQueryParams;
};
const PROJECT_CAMPAIGN_CACHE_REDIS_KEY =
  'projectCampaignCache-for-projectBySlug';

export const getAllProjectsRelatedToActiveCampaigns = async (): Promise<{
  [key: number]: string[];
}> => {
  const projectCampaignCache = await getRedisObject(
    PROJECT_CAMPAIGN_CACHE_REDIS_KEY,
  );
  // It returns all project and campaigns( excluding manuallySelectedCampaign)
  return projectCampaignCache || {};
};

export const cacheProjectCampaigns = async (): Promise<void> => {
  logger.debug('cacheProjectCampaigns() has been called');
  const newProjectCampaignCache = {};
  const activeCampaigns = await findAllActiveCampaigns();
  for (const campaign of activeCampaigns) {
    const projectsQueryParams = createFetchCampaignProjectsQuery(campaign);
    if (!projectsQueryParams) {
      continue;
    }
    const projectsQuery = filterProjectsQuery(projectsQueryParams);
    const projects = await projectsQuery.getMany();
    for (const project of projects) {
      newProjectCampaignCache[project.id]
        ? newProjectCampaignCache[project.id].push(campaign.slug)
        : (newProjectCampaignCache[project.id] = [campaign.slug]);
    }
  }
  await setObjectInRedis({
    key: PROJECT_CAMPAIGN_CACHE_REDIS_KEY,
    value: newProjectCampaignCache,
    // cronjob would fill it every 10 minutes so the expiration doesnt matter
    expirationInSeconds: 60 * 60 * 24 * 1, // 1 day
  });
  logger.debug(
    'cacheProjectCampaigns() ended successfully, projectCampaignCache size ',
    Object.keys(newProjectCampaignCache).length,
  );
};

export const fillCampaignProjects = async (params: {
  userId?: number;
  campaign: Campaign;
  projectsFiltersThreadPool: Pool<ModuleThread<ProjectResolverWorker>>;
}): Promise<Campaign> => {
  const { campaign, userId, projectsFiltersThreadPool } = params;
  const projectsQueryParams = createFetchCampaignProjectsQuery(campaign);
  if (!projectsQueryParams) {
    return campaign;
  }
  const projectsQuery = filterProjectsQuery(projectsQueryParams);
  const projectsQueryCacheKey = await projectsFiltersThreadPool.queue(hasher =>
    hasher.hashProjectFilters({
      ...projectsQueryParams,
      suffix: 'cq',
    }),
  );
  let projects: Project[];
  let totalCount: number;
  // eslint-disable-next-line prefer-const
  [projects, totalCount] = await projectsQuery
    .cache(projectsQueryCacheKey, projectFiltersCacheDuration)
    .getManyAndCount();

  if (campaign.type === CampaignType.ManuallySelected) {
    // This function would be called just for showing campaigns in homepage, and we should
    // show projects that has been set manually in order of what admin has chosen in admin panel
    // so we do this sorting at the end to override other sorting
    projects = projects.sort(
      (a, b) =>
        campaign.relatedProjectsSlugs.findIndex(slug => a.slug === slug) -
        campaign.relatedProjectsSlugs.findIndex(slug => b.slug === slug),
    );
  }

  if (userId && projects.length > 0) {
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
