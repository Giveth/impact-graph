import { Campaign, CampaignType } from '../entities/campaign';
import {
  filterProjectsQuery,
  findProjectBySlug,
  findProjectsBySlugArray,
} from '../repositories/projectRepository';
import { FilterField, Project, SortingField } from '../entities/project';
import { findUserReactionsByProjectIds } from '../repositories/reactionRepository';

export const fillCampaignProjects = async (params: {
  userId?: number;
  campaign: Campaign;
  skip?: number;
  limit?: number;
}): Promise<Campaign> => {
  const { campaign, userId } = params;
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
    [projects, totalCount] = await projectsQuery.getManyAndCount();
  } else if (campaign.type === CampaignType.SortField) {
    projectsQuery = filterProjectsQuery({
      limit,
      skip,
      sortingBy: campaign.sortingField as unknown as SortingField,
    });
    [projects, totalCount] = await projectsQuery.getManyAndCount();
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
