import { FeaturedUpdate } from '../../../entities/featuredUpdate';
import {
  canAccessFeaturedUpdateAction,
  ResourceActions,
} from '../adminJsPermissions';

export const featuredUpdateTab = {
  resource: FeaturedUpdate,
  options: {
    properties: {
      id: {
        isVisible: { show: true, edit: false, new: false, list: true },
      },
      projectId: {
        isVisible: { show: true, edit: true, new: true, list: true },
      },
      updatedAt: {
        isVisible: { show: true, edit: false, new: false, list: true },
      },
      createdAt: {
        isVisible: { show: true, edit: false, new: false, list: true },
      },
    },
    actions: {
      bulkDelete: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessFeaturedUpdateAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessFeaturedUpdateAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessFeaturedUpdateAction({ currentAdmin }, ResourceActions.SHOW),
      },
      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessFeaturedUpdateAction({ currentAdmin }, ResourceActions.EDIT),
      },
      delete: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessFeaturedUpdateAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      new: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessFeaturedUpdateAction({ currentAdmin }, ResourceActions.NEW),
      },
    },
  },
};
