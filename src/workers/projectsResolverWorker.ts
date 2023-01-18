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
    connectedWalletUserId?: number;
    suffix?: string;
  }) {
    return await generateProjectFiltersCacheKey(args);
  },
  async mergeUserReactionsToProjects(
    projects: Project[],
    userReactions: Reaction[],
  ) {
    return projects.map(project => {
      const reaction = userReactions.find(
        userReaction => userReaction.projectId === project.id,
      );

      if (reaction) {
        project.reaction = reaction;
      }

      return project;
    });
  },
});
