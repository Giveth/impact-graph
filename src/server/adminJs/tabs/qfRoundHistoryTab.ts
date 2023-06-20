import {
  canAccessQfRoundAction,
  canAccessQfRoundHistoryAction,
  ResourceActions,
} from '../adminJsPermissions';

import { QfRoundHistory } from '../../../entities/qfRoundHistory';
import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
} from '../adminJs-types';

import { fillQfRoundHistory } from '../../../repositories/qfRoundHistoryRepository';

export const updateQfRoundHistory = async (
  _request: AdminJsRequestInterface,
  _response,
  _context: AdminJsContextInterface,
) => {
  await fillQfRoundHistory();
  return {
    redirectUrl: '/admin/resources/QfRoundHistory',
    record: {},
    notice: {
      message: `Qf round history has been updated for inActive ended rounds`,
      type: 'success',
    },
  };
};

export const qfRoundHistoryTab = {
  resource: QfRoundHistory,
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
      minimumPassportScore: {
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
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.DELETE,
          ),
      },
      bulkDelete: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },

      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction({ currentAdmin }, ResourceActions.EDIT),
      },
      show: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction({ currentAdmin }, ResourceActions.SHOW),
      },
      updateQfRoundHistories: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.UPDATE_QF_ROUND_HISTORIES,
          ),
        handler: updateQfRoundHistory,
        component: false,
      },
    },
  },
};
