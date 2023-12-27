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
import { insertDonationsFromQfRoundHistory } from '../../../services/donationService';
import { refreshProjectDonationSummaryView } from '../../../services/projectViewsService';
import { refreshUserProjectPowerView } from '../../../repositories/userProjectPowerViewRepository';

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
export const CreateRelatedDonationsForQfRoundHistoryRecords = async (
  _request: AdminJsRequestInterface,
  _response,
  _context: AdminJsContextInterface,
) => {
  await insertDonationsFromQfRoundHistory();
  await refreshProjectDonationSummaryView();
  return {
    redirectUrl: '/admin/resources/QfRoundHistory',
    record: {},
    notice: {
      message: `Related donations for qfRoundHistory has been added`,
      type: 'success',
    },
  };
};

export const qfRoundHistoryTab = {
  resource: QfRoundHistory,
  options: {
    properties: {
      project: {
        isVisible: {
          list: false,
          edit: false,
          filter: true,
          show: true,
        },
      },
      qfRound: {
        isVisible: {
          list: false,
          edit: false,
          filter: true,
          show: true,
        },
      },
      uniqueDonors: {
        isVisible: true,
      },
      donationsCount: {
        isVisible: true,
      },
      raisedFundInUsd: {
        isVisible: true,
      },
      matchingFund: {
        isVisible: true,
      },
      distributedFundNetwork: {
        isVisible: true,
      },
      distributedFundTxHash: {
        isVisible: {
          list: false,
          edit: true,
          filter: true,
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
      RelateDonationsWithDistributedFunds: {
        actionType: 'resource',
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundHistoryAction(
            { currentAdmin },
            ResourceActions.UPDATE_QF_ROUND_HISTORIES,
          ),
        handler: CreateRelatedDonationsForQfRoundHistoryRecords,
        component: false,
      },
    },
  },
};
