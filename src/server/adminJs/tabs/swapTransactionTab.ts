import {
  canAccessProjectFraudAction,
  ResourceActions,
} from '../adminJsPermissions';
import { SwapTransaction } from '../../../entities/swapTransaction';

export const SwapTransactionTab = {
  resource: SwapTransaction,

  options: {
    properties: {
      id: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      squidRequestId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      firstTxHash: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      secondTxHash: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      fromChainId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      toChainId: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      fromTokenAddress: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      toTokenAddress: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      fromAmount: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      toAmount: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      fromTokenSymbol: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      toTokenSymbol: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
      },
      status: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: true,
          new: true,
        },
        availableValues: [
          { value: 'pending', label: 'Pending' },
          { value: 'ongoing', label: 'Ongoing' },
          { value: 'destination_executed', label: 'Destination Executed' },
          { value: 'success', label: 'Success' },
          { value: 'failed', label: 'Failed' },
        ],
      },
      metadata: {
        isVisible: {
          list: false,
          filter: false,
          show: true,
          edit: true,
          new: true,
        },
        type: 'mixed',
      },
      donation: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      createdAt: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
      updatedAt: {
        isVisible: {
          list: true,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
    },

    actions: {
      new: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectFraudAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectFraudAction({ currentAdmin }, ResourceActions.EDIT),
      },
      delete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectFraudAction({ currentAdmin }, ResourceActions.DELETE),
      },
      bulkDelete: {
        isAccessible: ({ currentAdmin }) =>
          canAccessProjectFraudAction({ currentAdmin }, ResourceActions.EDIT),
      },
    },
  },
};
