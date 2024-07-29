// workers/auth.js
import { expose } from 'threads/worker';
import { FilterField, Project, SortingField } from '../entities/project.js';
import { generateProjectFiltersCacheKey } from '../utils/utils.js';
import { Reaction } from '../entities/reaction.js';

const worker = {
  async hashProjectFilters(args: {
    limit?: number;
    skip?: number;
    searchTerm?: string;
    category?: string;
    mainCategory?: string;
    filters?: FilterField[];
    sortingBy?: SortingField;
    slugArray?: string[];
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
};

expose(worker);
