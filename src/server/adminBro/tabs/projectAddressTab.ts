import { ProjectAddress } from '../../../entities/projectAddress';
import {
  canAccessProjectAddressAction,
  ResourceActions,
} from '../adminBroPermissions';

export const projectAddressTab = {
  resource: ProjectAddress,
  options: {
    actions: {
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
