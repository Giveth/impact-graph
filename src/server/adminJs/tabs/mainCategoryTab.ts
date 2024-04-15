import { MainCategory } from '../../../entities/mainCategory';
import {
  canAccessMainCategoryAction,
  ResourceActions,
} from '../adminJsPermissions';

export const mainCategoryTab = {
  resource: MainCategory,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.SHOW),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.DELETE),
      },
      new: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.EDIT),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
    properties: {
      id: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      banner: {
        isVisible: true,
      },
      isActive: {
        isVisible: true,
      },
      slug: {
        isVisible: true,
      },
      title: {
        isVisible: true,
      },
      description: {
        isVisible: true,
      },
    },
  },
};
