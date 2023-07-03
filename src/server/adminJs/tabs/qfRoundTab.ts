import { QfRound } from '../../../entities/qfRound';
import { canAccessQfRoundAction, ResourceActions } from '../adminJsPermissions';
import {
  ActionResponse,
  After,
} from 'adminjs/src/backend/actions/action.interface';
import {
  refreshProjectDonationSummaryView,
  refreshProjectEstimatedMatchingView,
} from '../../../services/projectViewsService';
import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
} from '../adminJs-types';
import { ValidationError } from 'adminjs';
import { isQfRoundHasEnded } from '../../../services/qfRoundService';
import { findQfRoundById } from '../../../repositories/qfRoundRepository';

export const refreshMaterializedViews = async (
  response,
): Promise<After<ActionResponse>> => {
  await refreshProjectEstimatedMatchingView();
  await refreshProjectDonationSummaryView();
  return response;
};

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
    actions: {
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.DELETE),
        after: refreshMaterializedViews,
      },
      bulkDelete: {
        isVisible: false,
      },
      new: {
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.NEW),
        after: refreshMaterializedViews,
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.EDIT),
        before: async (
          request: AdminJsRequestInterface,
          response,
          _context: AdminJsContextInterface,
        ) => {
          // https://docs.adminjs.co/basics/action#using-before-and-after-hooks
          if (request?.payload?.id) {
            const qfRoundId = Number(request.payload.id);
            const qfRound = await findQfRoundById(qfRoundId);
            if (!qfRound || isQfRoundHasEnded({ endDate: qfRound!.endDate })) {
              throw new ValidationError({
                endDate: {
                  message:
                    'The endDate has passed so qfRound cannot be edited.',
                },
              });
            }
          }
          return request;
        },
        after: refreshMaterializedViews,
      },
    },
  },
};
