import { Campaign } from '../entities/campaign';
import { filterProjectsQuery } from '../repositories/projectRepository';
import { FilterField, Project, SortingField } from '../entities/project';
import { findUserReactionsByProjectIds } from '../repositories/reactionRepository';

export const fillCampaignProjects = async (params: {
  userId: number;
  campaign: Campaign;
}): Promise<Campaign> => {
  const { campaign, userId } = params;
  let projects: Project[] = [];
  let projectsQuery;
  const limit = 5;
  const skip = 0;

  if (campaign.relatedProjects.length > 0) {
    projects = campaign.relatedProjects;
  } else if (campaign.filterFields.length > 0) {
    projectsQuery = filterProjectsQuery({
      limit,
      skip,
      filters: campaign.filterFields as unknown as FilterField[],
    });
    projects = await projectsQuery.getMany();
  } else if (campaign.sortingField) {
    projectsQuery = filterProjectsQuery({
      limit,
      skip,
      sortingBy: campaign.sortingField as unknown as SortingField,
    });
    projects = await projectsQuery.getMany();
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
  return campaign;
};
