import { ActionResponse, After } from 'adminjs';
import { Project, ProjectUpdate } from '../../../entities/project';
import {
  canAccessProjectUpdateAction,
  ResourceActions,
} from '../adminJsPermissions';
import { addFeaturedProjectUpdate } from './projectsTab';

export const setProjectsTitleAndSlug: After<ActionResponse> = async request => {
  if (Number(request?.records?.length) > 0) {
    const records = request?.records?.map(async update => {
      const project = await Project.findOne({
        where: { id: update.params.projectId },
      });

      update.params.projectTitle = project?.title;
      update.params.projectSlug = project?.slug;
      return update;
    });

    request.records = await Promise.all(records);
  }
  return request;
};

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
      projectTitle: {
        isVisible: {
          list: true,
          filter: false,
          show: true,
          edit: false,
        },
      },
      projectSlug: {
        isVisible: {
          list: true,
          filter: false,
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
          list: false,
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
          list: false,
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
      contentSummary: {
        isVisible: false,
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
      list: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectUpdateAction({ currentAdmin }, ResourceActions.LIST),
        after: setProjectsTitleAndSlug,
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
