// workers/auth.js
import { expose } from 'threads/worker';
import { FilterField } from '../resolvers/projectResolver';
import { SortingField } from '../entities/project';
import { generateProjectFiltersCacheKey } from '../utils/utils';

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
});
