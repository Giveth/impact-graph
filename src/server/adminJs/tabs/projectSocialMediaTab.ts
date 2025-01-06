import { ProjectSocialMedia } from '../../../entities/projectSocialMedia';
import {
  canAccessMainCategoryAction,
  ResourceActions,
} from '../adminJsPermissions';

export const projectSocialMediaTab = {
  resource: ProjectSocialMedia,
  options: {
    actions: {
      list: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.SHOW),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.DELETE),
      },
      new: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessMainCategoryAction({ currentAdmin }, ResourceActions.EDIT),
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
      type: {
        isVisible: true,
      },
      link: {
        isVisible: true,
      },
      slug: {
        isVisible: true,
      },
      project: {
        isVisible: true,
      },
      user: {
        isVisible: true,
      },
    },
  },
};
