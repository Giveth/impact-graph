import {
  ActionResponse,
  After,
} from 'adminjs/src/backend/actions/action.interface';
import adminJs, { ValidationError } from 'adminjs';
import { RecordJSON } from 'adminjs/src/frontend/interfaces/record-json.interface';
import { QfRound } from '../../../entities/qfRound';
import { canAccessQfRoundAction, ResourceActions } from '../adminJsPermissions';
import {
  getQfRoundActualDonationDetails,
  refreshProjectActualMatchingView,
  refreshProjectDonationSummaryView,
  refreshProjectEstimatedMatchingView,
} from '../../../services/projectViewsService';
import {
  AdminJsContextInterface,
  AdminJsRequestInterface,
} from '../adminJs-types';
import { isQfRoundHasEnded } from '../../../services/qfRoundService';
import {
  findQfRoundById,
  getRelatedProjectsOfQfRound,
} from '../../../repositories/qfRoundRepository';
import { NETWORK_IDS } from '../../../provider';
import { logger } from '../../../utils/logger';
import { messages } from '../../../utils/messages';
import { addQfRoundDonationsSheetToSpreadsheet } from '../../../services/googleSheets';
import { errorMessages } from '../../../utils/errorMessages';

export const refreshMaterializedViews = async (
  response,
): Promise<After<ActionResponse>> => {
  await refreshProjectEstimatedMatchingView();
  await refreshProjectDonationSummaryView();
  await refreshProjectActualMatchingView();
  return response;
};

export const fillProjects: After<ActionResponse> = async (
  response,
  _request,
  _context,
) => {
  const record: RecordJSON = response.record || {};
  const qfRoundId = record.params.qfRoundId || record.params.id;
  const projects = await getRelatedProjectsOfQfRound(qfRoundId);
  response.record = {
    ...record,
    params: {
      ...record.params,
      projects,
    },
  };
  return response;
};

const returnAllQfRoundDonationAnalysis = async (
  context: AdminJsContextInterface,
  request: AdminJsRequestInterface,
) => {
  const { record, currentAdmin } = context;
  const qfRoundId = Number(request?.params?.recordId);
  logger.debug('qfRoundId', qfRoundId);

  const qfRoundDonationsRows = await getQfRoundActualDonationDetails(qfRoundId);
  logger.debug('qfRoundDonationsRows', qfRoundDonationsRows);
  await addQfRoundDonationsSheetToSpreadsheet({
    rows: qfRoundDonationsRows,
    qfRoundId,
  });
  // TODO Upload to google sheet

  return {
    record: record.toJSON(currentAdmin),
    notice: {
      message: messages.QF_ROUND_DATA_UPLOAD_IN_GOOGLE_SHEET_SUCCESSFULLY,
      type: 'success',
    },
  };
};

export const qfRoundTab = {
  resource: QfRound,
  options: {
    properties: {
      name: {
        isVisible: true,
      },
      slug: {
        isVisible: true,
      },
      isActive: {
        isVisible: true,
      },
      maximumReward: {
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
      minimumValidUsdValue: {
        isVisible: true,
      },
      eligibleNetworks: {
        isVisible: true,
        type: 'array',
        availableValues: [
          { value: NETWORK_IDS.MAIN_NET, label: 'MAINNET' },
          { value: NETWORK_IDS.ROPSTEN, label: 'ROPSTEN' },
          { value: NETWORK_IDS.GOERLI, label: 'GOERLI' },
          { value: NETWORK_IDS.POLYGON, label: 'POLYGON' },
          { value: NETWORK_IDS.OPTIMISTIC, label: 'OPTIMISTIC' },
          { value: NETWORK_IDS.ETC, label: 'ETC' },
          {
            value: NETWORK_IDS.MORDOR_ETC_TESTNET,
            label: 'MORDOR ETC TESTNET',
          },
          { value: NETWORK_IDS.OPTIMISM_SEPOLIA, label: 'OPTIMISM SEPOLIA' },
          { value: NETWORK_IDS.CELO, label: 'CELO' },
          {
            value: NETWORK_IDS.CELO_ALFAJORES,
            label: 'ALFAJORES (Test CELO)',
          },
          { value: NETWORK_IDS.ARBITRUM_MAINNET, label: 'ARBITRUM MAINNET' },
          { value: NETWORK_IDS.ARBITRUM_SEPOLIA, label: 'ARBITRUM SEPOLIA' },
          { value: NETWORK_IDS.XDAI, label: 'XDAI' },
          { value: NETWORK_IDS.BSC, label: 'BSC' },
        ],
      },
      projects: {
        type: 'mixed',
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: false,
        },
        components: {
          show: adminJs.bundle('./components/ProjectsInQfRound'),
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
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.SHOW),
        after: fillProjects,
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.EDIT),
        before: async (
          request: AdminJsRequestInterface,
          _response,
          _context: AdminJsContextInterface,
        ) => {
          // https://docs.adminjs.co/basics/action#using-before-and-after-hooks
          if (request?.payload?.id) {
            const qfRoundId = Number(request.payload.id);
            const qfRound = await findQfRoundById(qfRoundId);
            if (!qfRound) {
              throw new ValidationError({
                endDate: {
                  message: errorMessages.QF_ROUND_NOT_FOUND,
                },
              });
            }
            if (isQfRoundHasEnded({ endDate: qfRound!.endDate })) {
              // When qf round is ended we should not be able to edit begin date and end date
              // https://github.com/Giveth/giveth-dapps-v2/issues/3864
              request.payload.endDate = qfRound.endDate;
              request.payload.beginDate = qfRound.beginDate;
            }
          }
          return request;
        },
        after: refreshMaterializedViews,
      },

      returnAllDonationData: {
        // https://docs.adminjs.co/basics/action#record-type-actions
        actionType: 'record',
        isVisible: true,
        handler: async (request, response, context) => {
          return returnAllQfRoundDonationAnalysis(context, request);
        },
        component: false,
      },
    },
  },
};
