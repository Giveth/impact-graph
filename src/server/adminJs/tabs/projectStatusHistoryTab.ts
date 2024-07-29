import { ProjectStatusHistory } from '../../../entities/projectStatusHistory.js';
import {
  canAccessProjectStatusHistoryAction,
  ResourceActions,
} from '../adminJsPermissions.js';

export const projectStatusHistoryTab = {
  resource: ProjectStatusHistory,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusHistoryAction(
            { currentAdmin },
            ResourceActions.LIST,
          ),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusHistoryAction(
            { currentAdmin },
            ResourceActions.SHOW,
          ),
      },
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
