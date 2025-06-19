import { Cause } from '../../../entities/cause';
import {
  canAccessCauseAction,
  ResourceActions,
} from '../adminJsPermissions';

export const causesTab = {
  resource: Cause,
  options: {
    actions: {
      list: {
        isAccessible: ({ currentAdmin }) =>
          canAccessCauseAction({ currentAdmin }, ResourceActions.LIST),
      },
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessCauseAction({ currentAdmin }, ResourceActions.SHOW),
      },
      delete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessCauseAction({ currentAdmin }, ResourceActions.DELETE),
      },
      new: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessCauseAction({ currentAdmin }, ResourceActions.NEW),
      },
      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessCauseAction({ currentAdmin }, ResourceActions.EDIT),
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: ({ currentAdmin }) =>
          canAccessCauseAction(
            { currentAdmin },
            ResourceActions.BULK_DELETE,
          ),
      },
    },
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
      title: {
        isVisible: true,
      },
      slug: {
        isVisible: true,
      },
      description: {
        isVisible: true,
      },
      chainId: {
        isVisible: true,
      },
      fundingPoolAddress: {
        isVisible: true,
      },
      causeId: {
        isVisible: true,
      },
      depositTxHash: {
        isVisible: true,
      },
      depositTxChainId: {
        isVisible: true,
      },
      mainCategory: {
        isVisible: true,
      },
      subCategories: {
        isVisible: true,
      },
      status: {
        isVisible: true,
      },
      listingStatus: {
        isVisible: true,
      },
      givpowerRank: {
        isVisible: true,
      },
      instantBoostingRank: {
        isVisible: true,
      },
      activeProjectsCount: {
        isVisible: true,
      },
      totalRaised: {
        isVisible: true,
      },
      totalDistributed: {
        isVisible: true,
      },
      totalDonated: {
        isVisible: true,
      },
      givPower: {
        isVisible: true,
      },
      givBack: {
        isVisible: true,
      },
      ownerId: {
        isVisible: {
          list: false,
          filter: true,
          show: true,
          edit: true,
          new: true,
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
          list: false,
          filter: true,
          show: true,
          edit: false,
          new: false,
        },
      },
    },
  },
};
