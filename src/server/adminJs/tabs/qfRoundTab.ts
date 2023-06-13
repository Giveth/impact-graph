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
    // TODO should call below expression after any changes on qfRounds
    // if (!isTestEnv) {
    //       // They will fail in test env, because we run migrations after bootstrap so refreshing them will cause this error
    //       // relation "project_estimated_matching_view" does not exist
    //       await refreshProjectEstimatedMatchingView();
    //       await refreshProjectDonationSummaryView();
    //     }
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
