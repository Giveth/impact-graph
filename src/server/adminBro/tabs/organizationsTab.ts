import { Organization } from '../../../entities/organization';
import {
  canAccessOrganizationAction,
  ResourceActions,
} from '../adminBroPermissions';

export const organizationsTab = {
  resource: Organization,
  options: {
    actions: {
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
