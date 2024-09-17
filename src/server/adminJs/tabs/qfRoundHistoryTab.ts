import adminJs from 'adminjs';
import {
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
      projectId: {
        isVisible: {
          list: true,
          edit: false,
          filter: true,
          show: true,
        },
        reference: 'Project',
        position: 100,
        type: 'reference',
        custom: {
          getValue: record => {
            return record.params.project?.id || record.params.projectId;
          },
          renderValue: (value, _record) => {
            return value ? `Project ${value}` : 'N/A';
          },
        },
        components: {
          list: adminJs.bundle('./components/CustomProjectReferenceComponent'),
          show: adminJs.bundle(
            './components/CustomProjectReferenceShowComponent',
          ),
          filter: adminJs.bundle('./components/CustomIdFilterComponent'),
        },
      },
      qfRoundId: {
        isVisible: {
          list: true,
          edit: false,
          filter: true,
          show: true,
        },
        reference: 'QfRound',
        position: 101,
        type: 'reference',
        custom: {
          getValue: record => {
            return record.params.qfRound?.id || record.params.qfRoundId;
          },
          renderValue: (value, _record) => {
            return value ? `QF Round ${value}` : 'N/A';
          },
        },
        components: {
          list: adminJs.bundle('./components/CustomQfRoundReferenceComponent'),
          show: adminJs.bundle(
            './components/CustomQfRoundReferenceShowComponent',
          ),
          filter: adminJs.bundle('./components/CustomIdFilterComponent'),
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
      bulkUpdateQfRound: {
        component: adminJs.bundle(
          './components/CustomQfRoundMultiUpdateComponent',
        ),
        handler: async (request, _response, _context) => {
          const { records } = request.payload;
          const results: string[] = [];

          for (const record of records) {
            const {
              projectId,
              qfRoundId,
              matchingFund,
              matchingFundAmount,
              matchingFundPriceUsd,
              matchingFundCurrency,
              distributedFundTxHash,
              distributedFundNetwork,
              distributedFundTxDate,
            } = record;

            const existingRecord = await QfRoundHistory.findOne({
              where: { projectId, qfRoundId },
            });

            if (existingRecord) {
              await QfRoundHistory.createQueryBuilder()
                .update(QfRoundHistory)
                .set({
                  matchingFund,
                  matchingFundAmount,
                  matchingFundPriceUsd,
                  matchingFundCurrency,
                  distributedFundTxHash,
                  distributedFundNetwork,
                  distributedFundTxDate: new Date(distributedFundTxDate),
                })
                .where('id = :id', { id: existingRecord.id })
                .execute();
              results.push(
                `Updated: Project ${projectId}, Round ${qfRoundId}, Matching Fund: ${matchingFund}`,
              );
            } else {
              results.push(
                `Project QfRoundHistory Not found for Project ${projectId}, Round ${qfRoundId}.`,
              );
            }
          }

          return {
            notice: {
              message: `Operations completed:\n${results.join('\n')}`,
              type: 'success',
            },
          };
        },
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
            ResourceActions.RELATE_DONATIONS_WITH_DISTRIBUTED_FUNDS,
          ),
        handler: CreateRelatedDonationsForQfRoundHistoryRecords,
        component: false,
      },
    },
  },
};
