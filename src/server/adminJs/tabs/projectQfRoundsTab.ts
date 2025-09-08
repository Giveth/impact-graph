import { ProjectQfRound } from '../../../entities/projectQfRound';
import {
  canAccessProjectQfRoundAction,
  ResourceActions,
} from '../adminJsPermissions';

export const projectQfRoundsTab = {
  resource: ProjectQfRound,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction({ currentAdmin }, ResourceActions.SHOW),
      },
      delete: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      new: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction({ currentAdmin }, ResourceActions.EDIT),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectQfRoundAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
    properties: {
      projectId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      qfRoundId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      sumDonationValueUsd: {
        isVisible: {
          list: true,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      countUniqueDonors: {
        isVisible: {
          list: true,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      createdAt: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
      updatedAt: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
          new: false,
        },
      },
    },
  },
};
