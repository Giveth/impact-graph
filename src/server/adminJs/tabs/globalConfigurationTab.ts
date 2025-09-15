import { GlobalConfiguration } from '../../../entities/globalConfiguration';
import { canAccessQfRoundAction, ResourceActions } from '../adminJsPermissions';

export const globalConfigurationTab = {
  resource: GlobalConfiguration,
  options: {
    properties: {
      key: {
        isVisible: true,
        isRequired: true,
      },
      value: {
        isVisible: true,
        isRequired: true,
      },
      description: {
        isVisible: true,
      },
      type: {
        isVisible: true,
        availableValues: [
          { value: 'number', label: 'Number' },
          { value: 'string', label: 'String' },
          { value: 'boolean', label: 'Boolean' },
        ],
      },
      isActive: {
        isVisible: true,
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
      show: {
        isAccessible: ({ currentAdmin }) =>
          canAccessQfRoundAction({ currentAdmin }, ResourceActions.SHOW),
      },
    },
  },
};
