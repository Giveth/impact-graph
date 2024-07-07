import { ProjectStatus } from '../../../entities/projectStatus';
import {
  canAccessProjectStatusAction,
  ResourceActions,
} from '../adminJsPermissions';

export const projectStatusTab = {
  resource: ProjectStatus,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusAction({ currentAdmin }, ResourceActions.SHOW),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      new: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusAction({ currentAdmin }, ResourceActions.EDIT),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
  },
};
