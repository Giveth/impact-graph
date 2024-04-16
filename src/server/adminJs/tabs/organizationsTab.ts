import { Organization } from '../../../entities/organization';
import {
  canAccessOrganizationAction,
  ResourceActions,
} from '../adminJsPermissions';

export const organizationsTab = {
  resource: Organization,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessOrganizationAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessOrganizationAction({ currentAdmin }, ResourceActions.SHOW),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessOrganizationAction({ currentAdmin }, ResourceActions.DELETE),
      },
      new: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessOrganizationAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessOrganizationAction({ currentAdmin }, ResourceActions.EDIT),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessOrganizationAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
  },
};
