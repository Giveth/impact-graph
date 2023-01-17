// workers/auth.js
import { expose } from 'threads/worker';
import { FilterField } from '../resolvers/projectResolver';
import { SortingField } from '../entities/project';
import { User } from '../entities/user';
import { generateProjectFiltersCacheKey } from '../utils/utils';

expose({
  hashProjectFilters(args: {
    limit?: number;
    skip?: number;
    searchTerm?: string;
    category?: string;
    mainCategory?: string;
    filters?: FilterField[];
    sortingBy?: SortingField;
    connectedWalletUserId?: number;
    userId?: number;
    suffix?: string;
  }) {
    return generateProjectFiltersCacheKey(args);
  },
});
