import { ProjectStatusReason } from '../../../entities/projectStatusReason';
import {
  canAccessProjectStatusReasonAction,
  ResourceActions,
} from '../adminJsPermissions';

export const projectStatusReasonTab = {
  resource: ProjectStatusReason,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.LIST,
          ),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.SHOW,
          ),
      },
      new: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.NEW,
          ),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.EDIT,
          ),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectStatusReasonAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
  },
};
