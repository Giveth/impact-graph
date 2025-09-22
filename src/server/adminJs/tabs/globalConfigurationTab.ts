import { GlobalConfiguration } from '../../../entities/globalConfiguration';
import { canAccessQfRoundAction, ResourceActions } from '../adminJsPermissions';
import { setGlobalConfigurationValue } from '../../../repositories/globalConfigurationRepository';

export const globalConfigurationTab = {
  resource: GlobalConfiguration,
  options: {
    properties: {
      // Show key and value with inline editing
      key: {
        isVisible: true,
        isTitle: true,
        isSortable: true,
      },
      value: {
        isVisible: true,
        isEditable: true,
        type: 'number',
        props: {
          step: 0.1,
          min: 0,
          max: 1,
        },
      },
      description: {
        isVisible: true,
        isEditable: false,
      },
      type: {
        isVisible: false,
      },
      isActive: {
        isVisible: false,
      },
      createdAt: {
        isVisible: false,
      },
      updatedAt: {
        isVisible: false,
      },
    },
    actions: {
      delete: {
        isVisible: false,
        isAccessible: () => false,
      },
      bulkDelete: {
        isVisible: false,
        isAccessible: () => false,
      },
      new: {
        isVisible: false,
        isAccessible: () => false,
      },
      edit: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.EDIT),
      },
      show: {
        isVisible: false,
        isAccessible: () => false,
      },
      list: {
        isVisible: true,
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.SHOW),
      },
      updateGlobalConfigs: {
        actionType: 'resource',
        isVisible: false, // Hidden from UI, only accessible via API
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.EDIT),
        handler: async (request, _response, _context) => {
          try {
            const { minimumPassportScore, minimumMBDScore } = request.payload;

            // Update passport score if provided
            if (
              minimumPassportScore !== null &&
              minimumPassportScore !== undefined
            ) {
              await setGlobalConfigurationValue(
                'GLOBAL_MINIMUM_PASSPORT_SCORE',
                minimumPassportScore.toString(),
                'Global minimum passport score required for all QF rounds',
                'number',
              );
            }

            // Update MBD score if provided
            if (minimumMBDScore !== null && minimumMBDScore !== undefined) {
              await setGlobalConfigurationValue(
                'GLOBAL_MINIMUM_MBD_SCORE',
                minimumMBDScore.toString(),
                'Global minimum MBD score required for all QF rounds',
                'number',
              );
            }

            return {
              record: {},
              notice: {
                message: 'Global configuration updated successfully',
                type: 'success',
              },
            };
          } catch (error) {
            return {
              record: {},
              notice: {
                message: `Failed to update global configuration: ${error.message}`,
                type: 'error',
              },
            };
          }
        },
      },
    },
  },
};
