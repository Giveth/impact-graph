import { Category } from '../../../entities/category';
import {
  canAccessCategoryAction,
  ResourceActions,
} from '../adminJsPermissions';

export const categoryTab = {
  resource: Category,
  options: {
    actions: {
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessCategoryAction({ currentAdmin }, ResourceActions.DELETE),
      },
      new: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessCategoryAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessCategoryAction({ currentAdmin }, ResourceActions.EDIT),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessCategoryAction(
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
      name: {
        isVisible: true,
      },
      isActive: {
        isVisible: true,
      },
      value: {
        isVisible: true,
      },
      mainCategoryId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
    },
  },
};
