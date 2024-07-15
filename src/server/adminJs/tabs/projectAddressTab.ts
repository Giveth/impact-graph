import { ProjectAddress } from '../../../entities/projectAddress.js';
import {
  canAccessProjectAddressAction,
  ResourceActions,
} from '../adminJsPermissions.js';

export const projectAddressTab = {
  resource: ProjectAddress,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAddressAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAddressAction({ currentAdmin }, ResourceActions.SHOW),
      },
      new: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAddressAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAddressAction({ currentAdmin }, ResourceActions.EDIT),
      },
      delete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAddressAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      bulkDelete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectAddressAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
  },
};
