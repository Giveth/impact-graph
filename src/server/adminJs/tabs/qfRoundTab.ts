import { QfRound } from '../../../entities/qfRound';
import {
  canAccessQfRoundAction,
  canAccessUserAction,
  ResourceActions,
} from '../adminJsPermissions';

export const qfRoundTab = {
  resource: QfRound,
  options: {
    properties: {
      name: {
        isVisible: true,
      },
      isActive: {
        isVisible: true,
      },
      beginDate: {
        isVisible: true,
      },
      endDate: {
        isVisible: true,
      },
      allocatedFund: {
        isVisible: true,
      },
      projects: {
        isVisible: {
          list: true,
          edit: false,
          filter: false,
          show: true,
        },
      },
      createdAt: {
        type: 'string',
        isVisible: {
          list: true,
          edit: false,
          filter: false,
          show: true,
        },
      },
      updatedAt: {
        type: 'string',
        isVisible: {
          list: true,
          edit: false,
          filter: false,
          show: true,
        },
      },
    },
    actions: {
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.DELETE),
      },
      bulkDelete: {
        isVisible: false,
      },
      new: {
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.EDIT),
      },
    },
  },
};
