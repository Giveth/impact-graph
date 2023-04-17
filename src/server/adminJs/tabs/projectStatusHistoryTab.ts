import { ProjectStatusHistory } from '../../../entities/projectStatusHistory';
import {
  canAccessProjectStatusHistoryAction,
  ResourceActions,
} from '../adminJsPermissions';

export const projectStatusHistoryTab = {
  resource: ProjectStatusHistory,
  options: {
    actions: {
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusHistoryAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      edit: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusHistoryAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
      },
      new: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusHistoryAction(
            { currentAdmin },
            ResourceActions.NEW,
          ),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusHistoryAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
  },
};
