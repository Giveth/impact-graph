import { ProjectUpdate } from '../../entities/project';
import {
  canAccessProjectUpdateAction,
  ResourceActions,
} from './adminBroPermissions';
import { addFeaturedProjectUpdate } from './projectsTab';

export const projectUpdateTab = {
  resource: ProjectUpdate,
  options: {
    properties: {
      id: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
        },
      },
      title: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
        },
      },
      projectId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
        },
      },
      userId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
        },
      },
      content: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
        },
      },
      totalReactions: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
        },
      },
      createdAt: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
        },
      },
      isMain: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
        },
      },
      isNonProfitOrganization: {
        isVisible: {
          list: true,
          filter: false,
          show: true,
          edit: false,
        },
      },
      organizationCountry: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      organizationWebsite: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      organizationDescription: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      twitter: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      facebook: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      linkedin: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      instagram: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      youtube: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      foundationDate: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      mission: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      achievedMilestones: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
      managingFundDescription: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
      },
    },
    actions: {
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectUpdateAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      new: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectUpdateAction({ currentAdmin }, ResourceActions.NEW),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectUpdateAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
      show: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectUpdateAction({ currentAdmin }, ResourceActions.SHOW),
      },
      edit: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectUpdateAction({ currentAdmin }, ResourceActions.EDIT),
      },
      addFeaturedProjectUpdate: {
        actionType: 'bulk',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectUpdateAction(
            { currentAdmin },
            ResourceActions.ADD_FEATURED_PROJECT_UPDATE,
          ),
        handler: async (request, response, context) => {
          return addFeaturedProjectUpdate(context, request);
        },
        component: false,
      },
    },
  },
};
