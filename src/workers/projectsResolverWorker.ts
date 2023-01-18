// workers/auth.js
import { expose } from 'threads/worker';
import { FilterField } from '../resolvers/projectResolver';
import { Project, SortingField } from '../entities/project';
import { generateProjectFiltersCacheKey } from '../utils/utils';
import { Reaction } from '../entities/reaction';

expose({
  async hashProjectFilters(args: {
    limit?: number;
    skip?: number;
    searchTerm?: string;
    category?: string;
    mainCategory?: string;
    filters?: FilterField[];
    sortingBy?: SortingField;
    suffix?: string;
  }) {
    return await generateProjectFiltersCacheKey(args);
  },
  async mergeUserReactionsToProjects(
    projects: Project[],
    userReactions: Reaction[],
  ) {
    const projectIdReactionMap: Record<Project['id'], Reaction> = {};
    userReactions.forEach(reaction => {
      projectIdReactionMap[reaction.projectId] = reaction;
    });

    return projects.map(project => {
      project.reaction = projectIdReactionMap[project.id];
      return project;
    });
  },
});
